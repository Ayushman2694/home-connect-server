import { AdminToken } from "../models/adminToken.model.js";
import { Notification } from "../models/notification.model.js";
import admin from "../config/firebase.js"; // Firebase Admin SDK

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

export const createReminder = async (req, res) => {
  try {
    const { userId, reminderId, messageText } = req.body;
    if (!userId || !reminderId || !messageText)
      return res
        .status(400)
        .json({ error: "Missing userId, reminderId or messageText" });

    // Create a notification document in MongoDB
    const notification = await Notification.create({
      type: "REMINDER",
      userId,
      message: messageText,
    });

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

    res.json({ success: true, notification });
  } catch (err) {
    console.error("Error creating reminder:", err);
    res.status(500).json({ error: "Failed to create reminder" });
  }
};
