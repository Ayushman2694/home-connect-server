import mongoose from "mongoose";

// Centralized, permanent log of every report filed across the app (Post,
// Comment, Deal, Event, Poll). This is additive to the existing per-content
// duplicate-check storage (Feed.report[], CommentReport, WholesaleDeal.report[])
// — those remain the source of truth for "has this user already reported X"
// at submission time; this collection is the durable, queryable audit trail
// used by the "My Reports" screens and any future admin dashboard.
const ReportSchema = new mongoose.Schema(
  {
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
    contentType: {
      type: String,
      enum: ["post", "comment", "deal", "event", "poll"],
      required: true,
    },
    // Feed _id (post/poll/event), WholesaleDeal _id (deal), or Comment subdoc
    // _id (comment).
    contentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    // For contentType "comment": the Feed _id the comment lives on.
    parentContentId: { type: mongoose.Schema.Types.ObjectId, ref: "Feed" },
    // Denormalized at write time so the log/audit trail survives the
    // underlying content being edited or deleted later.
    contentTitle: { type: String, trim: true },
    commentText: { type: String, trim: true },
    reason: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "reviewed", "closed"],
      default: "pending",
    },
    adminNotes: { type: String, trim: true },
    reviewedAt: { type: Date },
    // Soft-delete only: lets a reporter "withdraw" their own report request
    // without erasing it from the permanent audit log.
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// One report per user per piece of content.
ReportSchema.index(
  { contentType: 1, contentId: 1, reporterId: 1 },
  { unique: true },
);
// "Reports Submitted" tab.
ReportSchema.index({ reporterId: 1, isDeleted: 1, createdAt: -1 });
// "Reports On My Content" tab.
ReportSchema.index({ reportedUserId: 1, isDeleted: 1, createdAt: -1 });
// Admin moderation queue.
ReportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("Report", ReportSchema);
