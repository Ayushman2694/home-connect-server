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
    votes: {
      type: [
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
      ],
      // Ensure a userId appears at most once in votes array
      validate: {
        validator: function (arr) {
          if (!Array.isArray(arr)) return true;
          const ids = arr
            .map((v) => (v.userId ? v.userId.toString() : null))
            .filter(Boolean);
          return ids.length === new Set(ids).size;
        },
        message: "Duplicate userId found in votes array.",
      },
    }, // For poll - stores user votes

    // Event-specific fields
    eventDate: { type: String, trim: true }, // For event
    regDeadline: { type: String, trim: true }, // For event
    eventTime: { type: String, trim: true }, // For event
    maxParticipants: { type: String, trim: true }, // For event
    minParticipants: { type: String, trim: true }, // For event
    registeredParticipants: { type: Number, default: 0 }, // For event
    location: { type: String, trim: true, default: "pune" }, // For event
    eventDetails: {
      freeChildren: { type: Boolean, default: false },
      guests: { type: Boolean, default: false },
      materials: { type: Boolean, default: false },
      refreshments: { type: Boolean, default: false },
    }, // For event
    rsvps: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        price: { type: Number, default: 0 },
        participants: { type: Number, default: 1 },
        profilePhotoUrl: { type: String, trim: true },
        fullName: { type: String, trim: true },
        _id: false,
      },
    ], // For event

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
