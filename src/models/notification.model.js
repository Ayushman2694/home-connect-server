import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g. 'REMINDER'
  userId: { type: String, default: null },
  message: { type: String, required: true },
}, { timestamps: true });


export const Notification = mongoose.model("Notification", notificationSchema);
