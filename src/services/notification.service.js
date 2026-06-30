import admin from "../config/firebase.js";
import { UserToken } from "../models/userToken.model.js";
import User from "../models/user.model.js";
import { USER_ROLES } from "../utils/constants.js";
import { insertNotification, countUnread } from "../repositories/notification.repository.js";
import { emitToUser } from "../realtime/socket.js";

// FCM error codes that mean the token will never work again — safe to
// delete so UserToken doesn't accumulate dead tokens forever.
const DEAD_TOKEN_ERROR_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

async function pushToReceiver(receiverId, title, message, notificationType, metadata) {
  const tokensDoc = await UserToken.find({ userId: receiverId }).select("token -_id");
  const tokens = tokensDoc.map((t) => t.token);

  console.log(
    `[push] receiver=${receiverId} type=${notificationType} tokens=${tokens.length}`,
  );
  if (tokens.length === 0) {
    console.log(`[push] No FCM tokens registered for user ${receiverId} — skipping push.`);
    return;
  }

  const payload = {
    notification: { title, body: message },
    data: {
      notificationType,
      ...Object.fromEntries(
        Object.entries(metadata || {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ),
    },
    tokens,
  };

  let response;
  try {
    response = await admin.messaging().sendEachForMulticast(payload);
  } catch (error) {
    console.error(`[push] ❌ FCM send threw for user ${receiverId}:`, error.message);
    return;
  }

  console.log(
    `[push] FCM response for user ${receiverId}: ${response.successCount} succeeded, ${response.failureCount} failed`,
  );

  const deadTokens = [];
  response.responses.forEach((result, idx) => {
    if (result.success) return;
    const code = result.error?.code;
    console.warn(
      `[push] ❌ Delivery failed for token ${tokens[idx].slice(0, 16)}…: ${code} — ${result.error?.message}`,
    );
    if (DEAD_TOKEN_ERROR_CODES.has(code)) {
      deadTokens.push(tokens[idx]);
    }
  });

  if (deadTokens.length > 0) {
    await UserToken.deleteMany({ userId: receiverId, token: { $in: deadTokens } });
    console.log(`[push] Pruned ${deadTokens.length} dead token(s) for user ${receiverId}`);
  }
}

/**
 * Centralized creation point for every in-app/push notification in the app.
 * Persists the notification, fires FCM push, and emits Socket.IO events for
 * live list/badge updates. Every trigger site should call this (or
 * createNotificationForMany) instead of writing to the Notification model
 * directly.
 */
export async function createNotification({
  title,
  message,
  notificationType,
  sender = null,
  receiver,
  metadata = {},
  societyId = null,
}) {
  if (!receiver) return null;

  const notification = await insertNotification({
    title,
    message,
    notificationType,
    sender,
    receiver,
    metadata,
    societyId,
  });
  console.log(`[notification] Created ${notificationType} (${notification._id}) for ${receiver}`);

  const unreadCount = await countUnread(receiver);
  emitToUser(receiver, "notification:new", notification);
  emitToUser(receiver, "notification:unread-count", { unreadCount });

  await pushToReceiver(receiver, title, message, notificationType, metadata);

  return notification;
}

export async function createNotificationForMany({
  title,
  message,
  notificationType,
  sender = null,
  receivers,
  metadata = {},
  societyId = null,
}) {
  const uniqueReceivers = [...new Set((receivers || []).map((r) => String(r)))].filter(
    (id) => !sender || id !== String(sender),
  );
  return Promise.all(
    uniqueReceivers.map((receiver) =>
      createNotification({ title, message, notificationType, sender, receiver, metadata, societyId }),
    ),
  );
}

/** Resolves all admin/super_admin users — used for moderation-style alerts. */
export async function getAdminUserIds() {
  const admins = await User.find({
    roles: { $in: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
  }).select("_id");
  return admins.map((a) => a._id);
}

/** Resolves all residents of a society — used for deal/event broadcasts. */
export async function getSocietyUserIds(societyId) {
  const users = await User.find({ societyId }).select("_id");
  return users.map((u) => u._id);
}
