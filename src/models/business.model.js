import mongoose from "mongoose";

export const VERIFICATION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

const BusinessInfoSchema = new mongoose.Schema(
  {
    businessTitle: { type: String, trim: true },
    category: { type: String, trim: true },
    description: { type: String, trim: true },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      validate: {
        validator: function (v) {
          return /^\+?[1-9]\d{1,14}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid phone number!`,
      },
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    completeAddress: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    images: [{ type: String, trim: true }], // Array of image URLs

    price: {
      mrp: { type: String, required: true, default: "0" },
      discountedPrice: { type: String, default: "0" },
      sellingPrice: { type: String, required: true, default: "0" },
      discountPrcnt: { type: String, required: true, default: "0" },
      saveAmount: { type: String, required: true, default: "0" },
    },

    verificationStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.PENDING,
    },
    unit: { type: String, trim: true }, // Optional unit of measurement
    itemType: { type: String, trim: true }, // Optional item type

    businessPhone: { type: String, trim: true }, // Optional business phone number
    rejectionReason: { type: String, default: "" },
  },
  { timestamps: true }
);

const Business = mongoose.model("Business", BusinessInfoSchema);
export default Business;
