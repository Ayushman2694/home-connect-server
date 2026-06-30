import { AdminToken } from "../models/adminToken.model.js";
import { UserToken } from "../models/userToken.model.js";
import admin from "../config/firebase.js"; // Firebase Admin SDK
import {
  findByReceiver,
  countUnread,
  markRead,
  markAllRead,
  deleteNotification,
} from "../repositories/notification.repository.js";
import {
  createNotificationForMany,
  getSocietyUserIds,
} from "../services/notification.service.js";
import { NOTIFICATION_TYPES, USER_ROLES } from "../utils/constants.js";

export const registerAdminToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token is required" });

    // Save token only if it doesn't exist
    const existing = await AdminToken.findOne({ token });
    if (!existing) {
      await AdminToken.create({ token });
      console.log("✅ Admin token registered:", token);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error registering token:", err);
    res.status(500).json({ error: "Failed to register token" });
  }
};

export const registerUserToken = async (req, res) => {
  try {
    const { token, userId } = req.body;
    if (!token || !userId)
      return res.status(400).json({ error: "Token and userId are required" });

    // `token` is globally unique (one physical device token can only point
    // to one user at a time), so this must be an upsert keyed on token —
    // re-registering the same device under a different user (e.g. after
    // logout/login) reassigns ownership instead of throwing a duplicate-key
    // error.
    await UserToken.findOneAndUpdate(
      { token },
      { token, userId },
      { upsert: true, new: true },
    );
    console.log("✅ User token registered:", token, "for user:", userId);

    res.json({ success: true });
  } catch (err) {
    console.error("Error registering user token:", err);
    res.status(500).json({ error: "Failed to register user token" });
  }
};

export const createReminder = async (req, res) => {
  try {
    const { userId, reminderId, messageText } = req.body;
    if (!userId || !reminderId || !messageText)
      return res
        .status(400)
        .json({ error: "Missing userId, reminderId or messageText" });

    // Fetch all admin tokens from DB
    const tokens = await AdminToken.find().select("token -_id");
    const deviceTokens = tokens.map((t) => t.token);

    if (deviceTokens.length > 0) {
      // Send push notification via Firebase
      await admin.messaging().sendEachForMulticast({
        notification: { title: "New Reminder", body: messageText },
        data: { type: "REMINDER", userId: String(userId) },
        tokens: deviceTokens,
      });

      console.log("✅ Push notification sent to admins");
    } else {
      console.log("⚠️ No admin tokens registered yet");
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error creating reminder:", err);
    res.status(500).json({ error: "Failed to create reminder" });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);

    const { notifications, total, hasMore } = await findByReceiver({
      receiverId: req.userId,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      code: res.statusCode,
      data: notifications,
      meta: { total, page, limit, hasMore },
    });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ success: false, code: res.statusCode, message: err.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await countUnread(req.userId);
    res.status(200).json({ success: true, code: res.statusCode, unreadCount });
  } catch (err) {
    console.error("Error fetching unread count:", err);
    res.status(500).json({ success: false, code: res.statusCode, message: err.message });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await markRead(id, req.userId);
    if (!notification) {
      return res
        .status(404)
        .json({ success: false, code: res.statusCode, message: "Notification not found" });
    }
    res.status(200).json({ success: true, code: res.statusCode, data: notification });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ success: false, code: res.statusCode, message: err.message });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    await markAllRead(req.userId);
    res.status(200).json({ success: true, code: res.statusCode });
  } catch (err) {
    console.error("Error marking all notifications as read:", err);
    res.status(500).json({ success: false, code: res.statusCode, message: err.message });
  }
};

export const deleteNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await deleteNotification(id, req.userId);
    if (!notification) {
      return res
        .status(404)
        .json({ success: false, code: res.statusCode, message: "Notification not found" });
    }
    res.status(200).json({ success: true, code: res.statusCode });
  } catch (err) {
    console.error("Error deleting notification:", err);
    res.status(500).json({ success: false, code: res.statusCode, message: err.message });
  }
};

/**
 * Admin-authored broadcast — either to the sender's entire society
 * (`societyId` only) or to a specific set of users (`receiverIds`).
 * Reuses the same createNotificationForMany → pushToReceiver pipeline as
 * every other notification trigger; no separate send path.
 */
export const sendAnnouncement = async (req, res) => {
  try {
    const senderRoles = req.user?.roles || [];
    const isAdmin = senderRoles.includes(USER_ROLES.ADMIN) || senderRoles.includes(USER_ROLES.SUPER_ADMIN);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        code: 403,
        message: "Only admins can send announcements",
      });
    }

    const { title, message, societyId, receiverIds } = req.body;
    if (!title || !message) {
      return res
        .status(400)
        .json({ success: false, code: 400, message: "title and message are required" });
    }
    if (!societyId && !(Array.isArray(receiverIds) && receiverIds.length > 0)) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Either societyId (society-wide) or receiverIds (selected users) is required",
      });
    }

    const receivers = Array.isArray(receiverIds) && receiverIds.length > 0
      ? receiverIds
      : await getSocietyUserIds(societyId);

    await createNotificationForMany({
      title,
      message,
      notificationType: NOTIFICATION_TYPES.ANNOUNCEMENT,
      sender: req.userId,
      receivers,
      societyId: societyId || null,
    });

    res.status(200).json({ success: true, code: res.statusCode, recipientCount: receivers.length });
  } catch (err) {
    console.error("Error sending announcement:", err);
    res.status(500).json({ success: false, code: res.statusCode, message: err.message });
  }
};
