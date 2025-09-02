import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      default: "", // not required at OTP stage, user may be guest
      trim: true,
    },
    profilePic: {
      type: String,
      default: "",
    },
    isAddressVerified: {
      type: Boolean,
      default: false,
    },
    roles: {
      resident: { type: Boolean, default: true },
      business: { type: Boolean, default: false },
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
