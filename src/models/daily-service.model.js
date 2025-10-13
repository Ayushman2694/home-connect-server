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
    category: { type: String, trim: true },
    description: { type: String, trim: true },
    images: [{ type: String, trim: true }],
    averageRating: { type: String, trim: true },
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

const DailyService = mongoose.model("DailyService", DailyServiceSchema);
export default DailyService;
