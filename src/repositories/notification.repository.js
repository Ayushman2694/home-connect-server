import { Notification } from "../models/notification.model.js";

export async function insertNotification(doc) {
  return Notification.create(doc);
}

export async function findByReceiver({ receiverId, page, limit }) {
  const skip = (page - 1) * limit;
  const [notifications, total] = await Promise.all([
    Notification.find({ receiver: receiverId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "fullName profilePhotoUrl")
      .lean(),
    Notification.countDocuments({ receiver: receiverId }),
  ]);
  return {
    notifications,
    total,
    page,
    limit,
    hasMore: skip + notifications.length < total,
  };
}

export async function countUnread(receiverId) {
  return Notification.countDocuments({ receiver: receiverId, isRead: false });
}

export async function markRead(id, receiverId) {
  return Notification.findOneAndUpdate(
    { _id: id, receiver: receiverId },
    { $set: { isRead: true } },
    { new: true },
  );
}

export async function markAllRead(receiverId) {
  return Notification.updateMany(
    { receiver: receiverId, isRead: false },
    { $set: { isRead: true } },
  );
}

export async function deleteNotification(id, receiverId) {
  return Notification.findOneAndDelete({ _id: id, receiver: receiverId });
}
