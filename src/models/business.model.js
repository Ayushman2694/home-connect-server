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
    isBusinessVerified: {
      status: {
        type: String,
        enum: Object.values(VERIFICATION_STATUS),
        default: VERIFICATION_STATUS.PENDING,
      },
      rejectionReason: { type: String, default: null },
    },
    unit: { type: String, trim: true }, // Optional unit of measurement
    itemType: { type: String, trim: true }, // Optional item type
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Society",
      default: null,
    },
    report: {
      reason: [{ type: String, trim: true }],
      totalReportCount: { type: Number, default: 0 },
    },
    reviews: {
      type: [
        {
          _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          userName: { type: String, trim: true },
          rating: { type: Number, min: 1, max: 5, required: true },
          comment: { type: String, trim: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: null,
    },
    businessPhone: { type: String, trim: true }, // Optional business phone number
  },
  { timestamps: true }
);

const Business = mongoose.model("Business", BusinessInfoSchema);
export default Business;
