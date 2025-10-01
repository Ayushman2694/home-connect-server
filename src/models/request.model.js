import mongoose from "mongoose";
const requestSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    message: { type: String, required: true },
  },
  { timestamps: true }
);
const Request = mongoose.model("Request", requestSchema);
export default Request;
