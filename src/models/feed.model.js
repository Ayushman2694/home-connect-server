import mongoose from "mongoose";

const FeedSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    type: {
      type: String,
      enum: ["post", "poll", "event"],
      required: true,
    },
    description: { type: String, trim: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    content: {
      type: String,
      required: function () {
        return this.type === "post";
      },
    },
    images: [{ type: String, trim: true }],
    society: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Society",
      required: true,
    },
    flatNo: { type: String, trim: true },
    towerName: { type: String, trim: true },
    description: { type: String, trim: true },
    price: { type: String, trim: true },
    quantity: { type: String, trim: true },

    // Poll-specific fields
    options: [
      {
        id: { type: String },
        name: { type: String },
        _id: false,
      },
    ], // For poll
    votes: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        optionId: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        _id: false,
      },
    ], // For poll - stores user votes

    // Event-specific fields
    eventDate: { type: String, trim: true }, // For event
    eventTime: { type: String, trim: true }, // For event
    maxParticipants: { type: String, trim: true }, // For event
    minParticipants: { type: String, trim: true }, // For event
    location: { type: String, trim: true, default: "pune" }, // For event
    eventDetails: {
      freeChildren: { type: Boolean, default: false },
      guests: { type: Boolean, default: false },
      materials: { type: Boolean, default: false },
      refreshments: { type: Boolean, default: false },
    }, // For event
    rsvps: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      validate: {
        validator: function (arr) {
          if (!Array.isArray(arr)) return true;
          const stringIds = arr.map((id) => id?.toString());
          return stringIds.length === new Set(stringIds).size;
        },
        message: "Duplicate user found in rsvps array.",
      },
    }, // For event

    // Comments: array of { user, text, createdAt }
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Likes: array of user references
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.model("Feed", FeedSchema);
