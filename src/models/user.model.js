import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    fullName: { type: String },
    phone: { type: String, unique: true, sparse: true },

    // Roles → multiple allowed (resident + business possible)
    roles: {
      type: [String],
      enum: ["guest", "resident", "business"],
      default: ["guest"],
    },

    // Common profile
    profile_photo_url: String,

    is_Address_verified: { type: Boolean, default: false }, // overall KYC/approval

    // Resident-specific
    resident_info: {
      flat_number: String,
      building: String,
      society_id: { type: mongoose.Schema.Types.ObjectId, ref: "Society" },
      emergency_contacts: [String],
    },

    // Business-specific
    business_info: {
      business_name: String,
      category: String, // e.g. Grocery, Laundry, Food, etc.
      description: String,
      website: String,
      location: String,
      gst_number: String,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);
export default User;
