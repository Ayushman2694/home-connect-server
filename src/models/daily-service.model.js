import mongoose from "mongoose";

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
    verificationStatus: { type: String, default: "pending" },
    societyIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Society",
        },
      ],
      validate: {
        validator: function (arr) {
          const stringIds = arr.map((id) => id.toString());
          return stringIds.length === new Set(stringIds).size;
        },
        message: "Duplicate societyId found in societyIds array.",
      },
    },
    reviews: {
      type: [
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          rating: { type: Number, min: 1, max: 5, required: true },
          comment: { type: String, trim: true },
          createdAt: { type: Date, default: Date.now },
          reply: { type: String, trim: true },
        },
      ],
      default: null,
    },
  },
  { timestamps: true }
);

const DailyService = mongoose.model("DailyService", DailyServiceSchema);
export default DailyService;
