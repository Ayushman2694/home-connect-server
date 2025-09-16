import mongoose from "mongoose";

const BusinessInfoSchema = new mongoose.Schema(
  {
    business_name: { type: String, trim: true },
    category: { type: String, trim: true },
    description: { type: String, trim: true },
    website: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return (
            !v ||
            /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/.test(
              v
            )
          );
        },
        message: (props) => `${props.value} is not a valid website URL!`,
      },
    },
    location: { type: String, trim: true },
    gst_number: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return (
            !v ||
            /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v)
          );
        },
        message: (props) => `${props.value} is not a valid GST number!`,
      },
    },
  },
);

const Business = mongoose.model("Business",BusinessInfoSchema);
export default Business;