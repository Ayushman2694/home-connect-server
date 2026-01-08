import mongoose from "mongoose";
import { USER_ROLES, VERIFICATION_STATUS } from "../utils/constants.js";

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      maxLength: [100, "Full name cannot be more than 100 characters"],
    },
    completeAddress: { type: String, default: "" },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      required: [true, "Phone number is required"],
      validate: {
        validator: function (v) {
          return /^\+?[1-9]\d{1,14}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid phone number!`,
      },
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email!`,
      },
    },
    roles: {
      type: [String],
      enum: Object.values(USER_ROLES),
      default: [USER_ROLES.GUEST],
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "At least one role is required",
      },
    },
    profilePhotoUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return (
            !v ||
            /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/.test(
              v
            )
          );
        },
        message: (props) => `${props.value} is not a valid URL!`,
      },
    },
    isAddressVerified: {
      status: {
        type: String,
        enum: Object.values(VERIFICATION_STATUS),
        default: VERIFICATION_STATUS.PENDING,
      },
      rejectionReason: { type: String, default: null },
    },
    tower: { type: String, trim: true },
    flatNo: { type: String, trim: true },
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Society",
      default: null,
    },
    businessIds: [
      {
        id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Business",
        },
        verificationStatus: {
          type: String,
          enum: ["pending", "approved", "rejected"],
        },
      },
    ],
    // Lightweight pointers to a user's orders across sources
    orders: [
      {
        sourceType: {
          type: String,
          enum: ["wholesale", "business", "event"],
          required: true,
        },
        sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
        orderId: { type: mongoose.Schema.Types.ObjectId, required: true },
        quantity: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
        status: {
          type: String,
          enum: ["pending", "confirmed", "cancelled", "delivered"],
          default: "pending",
        },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", UserSchema);
export default User;
