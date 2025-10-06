import mongoose from "mongoose";

const WholesaleDealSchema = new mongoose.Schema(
  {
    dealTitle: {
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
    itemPhotos: [{ type: String, trim: true }], // Array of image URLs
    description: { type: String, trim: true },
    quantityAvailable: { type: Number, required: true, min: 1 },
    quantityUnit: { type: String, trim: true }, // e.g., kg, liters, pieces
    minimumOrderQuantity: { type: Number, required: true, min: 1 },
    maximumOrderQuantity: { type: Number, min: 1 },
    price: {
      mrp: { type: String, required: true, default: "0" },
      discountedPrice: { type: String, default: "0" },
      sellingPrice: { type: String, required: true, default: "0" },
      discountPrcnt: { type: String, required: true, default: "0" },
      saveAmount: { type: String, required: true, default: "0" },
    },
  },
  {
    timestamps: true,
  }
);

const WholesaleDeal = mongoose.model("WholesaleDeal", WholesaleDealSchema);
export default WholesaleDeal;
