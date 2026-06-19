import mongoose from "mongoose";
import { DEAL_STATUS, VERIFICATION_STATUS } from "../utils/constants.js";

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  quantity: { type: Number, required: true },
  amount: { type: Number, required: true },
  dealerName: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "confirmed", "cancelled", "delivered"],
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
    postedBy: { type: String, trim: true },
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
    orderStartDate: { type: String, default: null },
    orderDeadlineDate: { type: String, required: true },
    estimatedDeliveryDate: { type: String, required: true },
    dealOptions: {
      cashOnDelivery: { type: Boolean, default: false },
      moneyBackGuarantee: { type: Boolean, default: false },
      openBoxDelivery: { type: Boolean, default: false },
      freeSamples: { type: Boolean, default: false },
    },
    isDealActive: { type: Boolean, default: true },
    dealStatus: {
      type: String,
      trim: true,
      enum: Object.values(DEAL_STATUS),
      default: DEAL_STATUS.ACTIVE,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
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
    report: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        reason: { type: String, trim: true, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    totalReportCount: { type: Number, default: 0 },
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
  },
);

// Add indexes for optimized queries by userId and societyId
WholesaleDealSchema.index({ userId: 1 });
WholesaleDealSchema.index({ societyId: 1 });

// Pre-save middleware to automate deal lifecycle logic
WholesaleDealSchema.pre("save", function (next) {
  const deal = this;

  // If the deal was manually cancelled, keep it CANCELLED
  if (deal.dealStatus === "CANCELLED") {
    deal.isDealActive = false;
    return next();
  }

  const now = new Date();
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const deadlineStr = deal.orderDeadlineDate;
  const startDateStr = deal.orderStartDate;
const deadlineDate = new Date(deal.orderDeadlineDate);
    const hoursRemaining =
      (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);


  // Count approved/successful orders: approved, confirmed, delivered
  const totalApprovedQty = (deal.orders || [])
    .filter(
      (o) =>
        o.status === "approved" ||
        o.status === "confirmed" ||
        o.status === "delivered"
    )
    .reduce((sum, o) => sum + (o.quantity || 0), 0);

  // Sync currentOrderedQty field in database
  deal.currentOrderedQty = totalApprovedQty;

  const minQty = Number(deal.minimumOrderQty) || 0;
  const maxQty = Number(deal.maximumOrderQty) || 0;

  // COMING_SOON: Start date is in the future
  if (startDateStr && today < startDateStr) {
    deal.dealStatus = "COMING_SOON";
    deal.isDealActive = false;
  }
  // FAILED: Automatically trigger when: Current date > deadline date AND total approved orders < minQty
  else if (today > deadlineStr && totalApprovedQty < minQty) {
    deal.dealStatus = "FAILED";
    deal.isDealActive = false;
  }
  // FULL: Total approved orders reach the maximum order capacity
  else if (maxQty > 0 && totalApprovedQty >= maxQty) {
    deal.dealStatus = "FULL";
    deal.isDealActive = false;
  }
  //CLOSING_SOON: When Deal Close after 48 hours that are showing
  else if (hoursRemaining <= 48 && hoursRemaining > 0) {
    deal.dealStatus = "CLOSING_SOON";
    deal.isDealActive = true;
  }
  // UNLOCKED: Total approved orders >= minimum required quantity
  else if (totalApprovedQty >= minQty) {
    deal.dealStatus = "UNLOCKED";
    deal.isDealActive = true;
  }
  // UNLOCKING / ACTIVE: Goal not reached yet
  else {
    if (totalApprovedQty > 0) {
      deal.dealStatus = "UNLOCKING";
    } else {
      deal.dealStatus = "ACTIVE";
    }
    deal.isDealActive = true;
  }

  next();
});

const WholesaleDeal = mongoose.model("WholesaleDeal", WholesaleDealSchema);
export default WholesaleDeal;

// Index to efficiently find orders by user across deals and sort by time
// Helps queries like: db.wholesaledeals.find({ 'orders.userId': <uid> })
WholesaleDealSchema.index({ "orders.userId": 1, "orders.orderedAt": -1 });
