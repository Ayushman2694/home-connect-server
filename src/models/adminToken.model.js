import mongoose from "mongoose";

const adminTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

export const AdminToken = mongoose.model("AdminToken", adminTokenSchema);
