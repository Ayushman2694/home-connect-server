import admin from "../config/firebase.js";
import { AdminToken } from "../models/adminToken.model.js";
import { UserToken } from "../models/userToken.model.js";
import { Notification } from "../models/notification.model.js";

/**
 * Sends a push notification to all registered admin devices.
 * Also saves the notification in the database.
 * @param {string} title 
 * @param {string} body 
 * @param {object} data 
 */
export const sendToAdmins = async (title, body, data = {}) => {
  try {
    // Save to DB first
    await Notification.create({
      type: data.type || "ADMIN_ALERT",
      userId: null, // Admin notifications usually don't have a specific user
      message: body,
    });

    const tokensDoc = await AdminToken.find().select("token -_id");
    const tokens = tokensDoc.map((t) => t.token);

    if (tokens.length === 0) {
      console.log("⚠️ No admin tokens registered, skipping push");
      return;
    }

    const payload = {
      notification: { title, body },
      data: {
        ...data,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(payload);
    console.log(`✅ Admin notification sent: ${response.successCount} success, ${response.failureCount} failure`);
    return response;
  } catch (error) {
    console.error("❌ Error sending admin notification:", error);
  }
};

/**
 * Sends a push notification to all devices belonging to a specific user.
 * Also saves the notification in the database.
 * @param {string} userId 
 * @param {string} title 
 * @param {string} body 
 * @param {object} data 
 */
export const sendToUser = async (userId, title, body, data = {}) => {
  try {
    // Save to DB
    await Notification.create({
      type: data.type || "USER_ALERT",
      userId,
      message: body,
    });

    const tokensDoc = await UserToken.find({ userId }).select("token -_id");
    const tokens = tokensDoc.map((t) => t.token);

    if (tokens.length === 0) {
      console.log(`⚠️ No tokens registered for user ${userId}, skipping push`);
      return;
    }

    const payload = {
      notification: { title, body },
      data: {
        ...data,
        userId: String(userId),
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(payload);
    console.log(`✅ User notification sent to ${userId}: ${response.successCount} success, ${response.failureCount} failure`);
    return response;
  } catch (error) {
    console.error(`❌ Error sending user notification to ${userId}:`, error);
  }
};
