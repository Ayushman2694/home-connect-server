import mongoose from "mongoose";

// Reports filed against a comment on a Post/Poll feed item.
// Kept as its own collection (rather than embedded in Feed) so a single
// comment can carry multiple reports without bloating the parent Feed doc.
const CommentReportSchema = new mongoose.Schema(
  {
    commentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    contentType: { type: String, enum: ["post", "poll"], required: true },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Feed",
      required: true,
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: { type: String, trim: true, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// A user can only report a given comment once.
CommentReportSchema.index({ commentId: 1, reporterId: 1 }, { unique: true });

// Powers "which comments has this user already reported in this feed" used
// by getComments to compute the per-comment reportedByMe flag.
CommentReportSchema.index({ contentId: 1, reporterId: 1 });

export default mongoose.model("CommentReport", CommentReportSchema);
