import mongoose from "mongoose";

const SocietySchema = new mongoose.Schema({
  name: { type: String, required: true },
  totalFlats: { type: Number, required: true },
  maintenanceCharge: { type: Number, required: true },
  towers: { type: [String], default: [] },
  buildings: { type: Number, default: 0 },
  pincode: { type: String, required: true },
});

export const Society = mongoose.model("Society", SocietySchema);
