import mongoose from "mongoose";
import { DEAL_STATUS, VERIFICATION_STATUS } from "../utils/constants.js";

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
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
    phone: String,
  },
});

const WholesaleDealSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      maxLength: [100, "Deal title cannot be more than 100 characters"],
    },
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
    images: [{ type: String, trim: true }],
    category: { type: String, trim: true },
    description: { type: String, trim: true },
    quantityUnit: { type: String, trim: true },
    minimumOrderQty: { type: String, required: true, min: 1 },
    maximumOrderQty: { type: String, min: 1 },
    currentOrderedQty: { type: Number, required: true, min: 0, default: 0 },
    orders: [orderSchema],
    price: {
      mrp: { type: String, required: true, default: "0" },
      discountedPercent: { type: String, default: "0" },
      sellingPrice: { type: String, required: true, default: "0" },
      saveAmount: { type: String, required: true, default: "0" },
    },
    verificationStatus: {
      status: {
        type: String,
        enum: Object.values(VERIFICATION_STATUS),
        default: VERIFICATION_STATUS.PENDING,
      },
      rejectionReason: { type: String, default: null },
    },
    orderDeadlineDate: { type: String, required: true },
    estimatedDeliveryDate: { type: String, required: true },
    dealOptions: {
      cashOnDelivery: { type: Boolean, default: false },
      moneyBackGuarantee: { type: Boolean, default: false },
      openBoxDelivery: { type: Boolean, default: false },
      freeSamples: { type: Boolean, default: false },
    },
    isDealActive: { type: Boolean, default: false },
    dealStatus: {
      type: String,
      trim: true,
      enum: Object.values(DEAL_STATUS),
      default: DEAL_STATUS.PENDING,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
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
          profilePhotoUrl: { type: String, trim: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for optimized queries by userId and societyId
WholesaleDealSchema.index({ userId: 1 });
WholesaleDealSchema.index({ societyId: 1 });

const WholesaleDeal = mongoose.model("WholesaleDeal", WholesaleDealSchema);
export default WholesaleDeal;

// Index to efficiently find orders by user across deals and sort by time
// Helps queries like: db.wholesaledeals.find({ 'orders.userId': <uid> })
WholesaleDealSchema.index({ "orders.userId": 1, "orders.orderedAt": -1 });
