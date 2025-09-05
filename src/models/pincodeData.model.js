import mongoose from "mongoose";

const PincodeSchema = new mongoose.Schema({
  pincode: { type: String, required: true, unique: true },
  city: { type: String, required: true },
  area: { type: String, required: true },
  state: { type: String, required: true },
  societies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Society" }],
});

export const PincodeData = mongoose.model("PincodeData", PincodeSchema);
