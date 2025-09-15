import mongoose from "mongoose";

const SocietySchema = new mongoose.Schema({
  name: { type: String, required: true },
  totalFlats: { type: Number, required: true },
  maintenanceCharge: { type: Number, required: true },
  towers: [
    {
      name: { type: String, required: true },
      floors: { type: Number },
      flatsPerFloor: { type: Number },
      totalFlats: { type: Number },
      residentsCount: { type: Number },
    },
  ],
  pincode: { type: String, required: true },
  completeAddress: { type: String, default: "" },
  city: { type: String, default: "" },
  state: { type: String, default: "" },
});

export const Society = mongoose.model("Society", SocietySchema);
