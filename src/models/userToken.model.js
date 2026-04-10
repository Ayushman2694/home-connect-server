import mongoose from "mongoose";

const userTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index by userId for faster lookup when sending notifications to a specific user
userTokenSchema.index({ userId: 1 });

export const UserToken = mongoose.model("UserToken", userTokenSchema);
