import mongoose from "mongoose";

// Define constants for enums and validation
const USER_ROLES = {
  GUEST: "guest",
  RESIDENT: "resident",
  BUSINESS: "business",
};

const VERIFICATION_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
};

// Define sub-schemas for better organization
const EmergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    relation: { type: String },
  },
  { _id: false }
);

const SelectedSocietySchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Society",
      required: true,
    },
    name: { type: String, trim: true, default: "" },
    towerName: { type: String, trim: true, default: "" },
    flatNumber: { type: String, trim: true, default: "" },
    pincode: { type: String, trim: true, default: "" },
    completeAddress: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const ResidentInfoSchema = new mongoose.Schema(
  {
    flat_number: { type: String, trim: true },
    building: { type: String, trim: true },
    society_id: { type: mongoose.Schema.Types.ObjectId, ref: "Society" },
    emergency_contacts: [EmergencyContactSchema],
  },
  { _id: false }
);

const BusinessInfoSchema = new mongoose.Schema(
  {
    business_name: { type: String, trim: true },
    category: { type: String, trim: true },
    description: { type: String, trim: true },
    website: {
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
        message: (props) => `${props.value} is not a valid website URL!`,
      },
    },
    location: { type: String, trim: true },
    gst_number: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return (
            !v ||
            /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v)
          );
        },
        message: (props) => `${props.value} is not a valid GST number!`,
      },
    },
  },
  { _id: false }
);

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
    selectedSocietyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Society",
      default: null,
    },
    selectedSociety: SelectedSocietySchema,
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
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.PENDING,
    },
    verifyStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.PENDING,
    },
    residentInfo: ResidentInfoSchema,
    businessInfo: BusinessInfoSchema,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add indexes for frequently queried fields
UserSchema.index({ phone: 1 });
UserSchema.index({ selectedSocietyId: 1 });
UserSchema.index({ "residentInfo.society_id": 1 });

// Add instance methods if needed
UserSchema.methods.isResident = function () {
  return this.roles.includes(USER_ROLES.RESIDENT);
};

UserSchema.methods.isBusiness = function () {
  return this.roles.includes(USER_ROLES.BUSINESS);
};

// Add static methods if needed
UserSchema.statics.findByPhone = function (phone) {
  return this.findOne({ phone });
};

// Add pre-save middleware
UserSchema.pre("save", function (next) {
  // Ensure at least one role
  if (!this.roles || this.roles.length === 0) {
    this.roles = [USER_ROLES.GUEST];
  }
  next();
});

// Export constants for use in other files
export { USER_ROLES, VERIFICATION_STATUS };

// Create and export the model
const User = mongoose.model("User", UserSchema);
export default User;
