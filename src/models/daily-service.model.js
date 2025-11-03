import mongoose from "mongoose";
import { VERIFICATION_STATUS } from "../utils/constants.js";

const DailyServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      required: [true, "Phone number is required"],
      validate: {
        validator: function (v) {
          return /^\+?[1-9]\d{1,14}$/.test(v);
        },
        code: "400",
        message: (props) => `${props.value} is not a valid phone number!`,
      },
    },
    serviceType: { type: String, trim: true },
    categoryId: { type: String, trim: true },
    description: { type: String, trim: true },
    images: [{ type: String, trim: true }],
    averageRating: { type: Number, trim: true },
    verificationStatus: {
      status: {
        type: String,
        enum: Object.values(VERIFICATION_STATUS),
        default: VERIFICATION_STATUS.PENDING,
      },
      rejectionReason: { type: String, default: null },
    },
    report: {
      reason: [{ type: String, trim: true }],
      totalReportCount: { type: Number, default: 0 },
    },
    societyIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Society",
        },
      ],
      default: [],
      validate: {
        validator: function (arr) {
          if (!Array.isArray(arr)) return true; // allow undefined/null
          const stringIds = arr.map((id) => id?.toString());
          return stringIds.length === new Set(stringIds).size;
        },
        message: "Duplicate societyId found in societyIds array.",
      },
    },
    userIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
      validate: {
        validator: function (arr) {
          if (!Array.isArray(arr)) return true;
          const stringIds = arr.map((id) => id?.toString());
          return stringIds.length === new Set(stringIds).size;
        },
        message: "Duplicate userId found in userIds array.",
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
  },
  { timestamps: true }
);

// Indexes to speed up queries by membership (must be defined before model compilation)
DailyServiceSchema.index({ societyIds: 1 });
DailyServiceSchema.index({ userIds: 1 });

const DailyService = mongoose.model("DailyService", DailyServiceSchema);
export default DailyService;
