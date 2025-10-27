import mongoose from "mongoose";

export const VERIFICATION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

// Order schema for Business orders[]
const BusinessOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    quantity: { type: Number, required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "delivered"],
      default: "pending",
    },
    orderedAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    delivery: {
      address: String,
      contactPerson: String,
      phone: String,
    },
  },
  { _id: false }
);

const BusinessInfoSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
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
      mrp: { type: String, default: "0" },
      discountedPrice: { type: String, default: "0" },
      sellingPrice: { type: String, default: "0" },
      discountPrcnt: { type: String, default: "0" },
      saveAmount: { type: String, default: "0" },
    },
    verificationStatus: {
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
    // Orders placed on this business
    orders: { type: [BusinessOrderSchema], default: [] },
    businessPhone: { type: String, trim: true }, // Optional business phone number
  },
  { timestamps: true }
);

// Add an index on userId for fast queries by user
BusinessInfoSchema.index({ userId: 1 });

// If you store orders as an array of subdocuments on Business, this index
// accelerates per-user order lookups and time-sorted queries.
// It is safe to keep even if some documents don't have orders.
BusinessInfoSchema.index({ "orders.userId": 1, "orders.orderedAt": -1 });

// Compound index to optimize society + approval status filters
BusinessInfoSchema.index({ societyId: 1, "verificationStatus.status": 1 });

const Business = mongoose.model("Business", BusinessInfoSchema);
export default Business;
