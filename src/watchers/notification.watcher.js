import { Notification } from "../models/notification.model.js";
import { AdminToken } from "../models/adminToken.model.js";
import admin from "../config/firebase.js";

export const startNotificationWatcher = async () => {
  try {
    // Watch the Notification collection for new inserts
    const changeStream = Notification.watch();

    changeStream.on("change", async (change) => {
      if (change.operationType === "insert") {
        const doc = change.fullDocument;

        console.log("📢 New notification detected:", doc.message);

        try {
          // Fetch all admin device tokens from DB
          const tokens = await AdminToken.find().select("token -_id");
          const deviceTokens = tokens.map((t) => t.token);

          if (deviceTokens.length === 0) {
            console.log("⚠️ No admin tokens registered, skipping push");
            return;
          }

          // Construct FCM message
          const message = {
            notification: {
              title: "New Reminder",
              body: doc.message,
            },
            data: {
              type: doc.type,
              userId: String(doc.userId),
              notificationId: String(doc._id),
            },
            tokens: deviceTokens,
          };

          // Send push notification to all admin devices
          const response = await admin.messaging().sendEachForMulticast(message);

          console.log(
            `✅ Push notification sent to ${response.successCount} admins, failed for ${response.failureCount}`
          );

          // Optional: log failed tokens
          if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                console.warn(
                  `⚠️ Failed to send to ${deviceTokens[idx]}: ${resp.error}`
                );
              }
            });
          }
        } catch (err) {
          console.error("❌ Error sending notification:", err);
        }
      }
    });

    console.log("👂 Notification watcher started...");
  } catch (err) {
    console.error("❌ Failed to start notification watcher:", err);
  }
};
