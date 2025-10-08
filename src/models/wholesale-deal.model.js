import mongoose from "mongoose";

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
    itemPhotos: [{ type: String, trim: true }],
    description: { type: String, trim: true },
    quantityAvailable: { type: Number, required: true, min: 1 },
    quantityUnit: { type: String, trim: true },
    minimumOrderQuantity: { type: Number, required: true, min: 1 },
    maximumOrderQuantity: { type: Number, min: 1 },
    price: {
      mrp: { type: String, required: true, default: "0" },
      dealPrice: { type: String, required: true, default: "0" },
    },
    orderDeadline: { type: Date, required: true },
    estimatedDeliveryDate: { type: Date, required: true }, // ✅ Updated
    cod: { type: Boolean, default: false },
    moneyBackGuarantee: { type: Boolean, default: false },
    openBoxDelivery: { type: Boolean, default: false },
    freeSamples: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const WholesaleDeal = mongoose.model("WholesaleDeal", WholesaleDealSchema);
export default WholesaleDeal;
