// Send to one token
export async function sendPushNotification({ token, title, body, data = {} }) {
  if (!token) return;

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: token, sound: "default", title, body, data }),
  });

  const result = await res.json();
  if (result.data?.status === "error") {
    console.error("Push error:", result.data.message);
  }
}

// Send to all tokens of a user (multi-device support)
export async function sendPushNotificationToUser(user, title, body, data = {}) {
  const tokens = user.pushTokens?.filter(Boolean) ?? [];
  if (!tokens.length) return;

  // Expo accepts array for batch sending
  const messages = tokens.map((token) => ({
    to: token,
    sound: "default",
    title,
    body,
    data,
  }));

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });

  const result = await res.json();
  console.log("Batch push result:", result);
}

// Notify all admins of a society across all their devices
export async function notifyAdmins(societyId, title, body, data = {}) {
  const admins = await User.find({
    societyId,
    roles: { $in: ["admin", "super_admin"] },
    pushTokens: { $exists: true, $ne: [] },
  }).select("pushTokens");

  // Flatten all tokens from all admins
  const allMessages = admins.flatMap((admin) =>
    (admin.pushTokens ?? []).filter(Boolean).map((token) => ({
      to: token,
      sound: "default",
      title,
      body,
      data,
    })),
  );

  if (!allMessages.length) return;

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(allMessages),
  });

  const result = await res.json();
  console.log("Admin batch push result:", result);
}
