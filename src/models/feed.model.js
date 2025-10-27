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
    description: { type: String, trim: true },
    // Poll-specific fields
    options: [
      {
        id: { type: String },
        name: { type: String },
        _id: false,
      },
    ], // For poll
    // votes: [
    //   {
    //     userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    //     option: String,
    //   },
    // ],
    // Event-specific fields
    eventDate: Date, // For event
    location: String, // For event
    rsvps: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // For event

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
