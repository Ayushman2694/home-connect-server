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
          let deviceTokens = [];
          let targetTitle = "New Notification";

          if (doc.type === "ADMIN_ALERT" || !doc.userId) {
            // Fetch all admin device tokens from DB
            const tokens = await AdminToken.find().select("token -_id");
            deviceTokens = tokens.map((t) => t.token);
            targetTitle = "System Alert";
          } else {
            // Targeted notification for a specific user
            const { UserToken } = await import("../models/userToken.model.js");
            const tokens = await UserToken.find({ userId: doc.userId }).select("token -_id");
            deviceTokens = tokens.map((t) => t.token);
            targetTitle = doc.type === "REMINDER" ? "New Reminder" : "Notification";
          }

          if (deviceTokens.length === 0) {
            console.log("⚠️ No tokens registered for target, skipping push");
            return;
          }

          // Construct FCM message
          const message = {
            notification: {
              title: targetTitle,
              body: doc.message,
            },
            data: {
              type: doc.type,
              userId: String(doc.userId || ""),
              notificationId: String(doc._id),
            },
            tokens: deviceTokens,
          };

          // Send push notification
          const response = await admin.messaging().sendEachForMulticast(message);

          console.log(
            `✅ Push notification sent to ${response.successCount} targets, failed for ${response.failureCount}`
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
