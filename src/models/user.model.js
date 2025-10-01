import mongoose from "mongoose";

// Define constants for enums and validation
export const USER_ROLES = {
  GUEST: "guest",
  RESIDENT: "resident",
  BUSINESS: "business",
  ADMIN: "admin",
};

export const VERIFICATION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      maxLength: [100, "Full name cannot be more than 100 characters"],
    },
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
    verifyStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.PENDING,
    },
    tower: { type: String, trim: true },
    flatNumber: { type: String, trim: true },
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Society",
      default: null,
    },
    emergencyContacts: [String],
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", UserSchema);
export default User;
