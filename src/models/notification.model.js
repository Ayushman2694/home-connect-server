import mongoose from "mongoose";
import { NOTIFICATION_TYPES } from "../utils/constants.js";

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    notificationType: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isRead: { type: Boolean, default: false },
    // Optional — set for society-scoped notifications (announcements,
    // broadcasts) so they can be filtered/audited per society later.
    societyId: { type: mongoose.Schema.Types.ObjectId, ref: "Society", default: null },
    // Flat metadata bag — frontend reads whichever fields are relevant for
    // notificationType to build the deep-link route. All optional.
    metadata: {
      referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
      dealId: { type: mongoose.Schema.Types.ObjectId, default: null },
      orderId: { type: mongoose.Schema.Types.ObjectId, default: null },
      eventId: { type: mongoose.Schema.Types.ObjectId, default: null },
      communityId: { type: mongoose.Schema.Types.ObjectId, default: null },
      commentId: { type: mongoose.Schema.Types.ObjectId, default: null },
      reportId: { type: mongoose.Schema.Types.ObjectId, default: null },
      userId: { type: mongoose.Schema.Types.ObjectId, default: null },
    },
  },
  { timestamps: true },
);

notificationSchema.index({ receiver: 1, createdAt: -1 });
notificationSchema.index({ receiver: 1, isRead: 1 });

export const Notification = mongoose.model("Notification", notificationSchema);
