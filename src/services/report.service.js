import Report from "../models/report.model.js";
import { NOTIFICATION_TYPES } from "../utils/constants.js";
import { createNotification, createNotificationForMany, getAdminUserIds } from "./notification.service.js";

/**
 * Best-effort write to the permanent Report log. Never throws — a logging
 * failure must not break the primary report flow (reportFeed/reportComment/
 * reportDeal), which already enforce duplicate-prevention and the daily
 * limit against their own collections before calling this.
 */
export async function logReport({
  reporterId,
  reportedUserId,
  contentType,
  contentId,
  parentContentId,
  contentTitle,
  commentText,
  reason,
  description,
}) {
  try {
    const report = await Report.create({
      reporterId,
      reportedUserId,
      contentType,
      contentId,
      parentContentId,
      contentTitle,
      commentText,
      reason,
      description,
    });

    // Centralized admin alert for every report — single source of truth so
    // no individual controller has to remember to notify admins itself.
    try {
      const adminIds = await getAdminUserIds();
      await createNotificationForMany({
        title: "New Report Submitted",
        message: `A ${contentType} was reported: ${reason}`,
        notificationType: NOTIFICATION_TYPES.REPORT_SUBMITTED,
        sender: reporterId,
        receivers: adminIds,
        metadata: { reportId: report._id, referenceId: contentId },
      });
    } catch (notifyErr) {
      console.error("Failed to notify admins of new report:", notifyErr.message);
    }

    // Also let the content owner know their content was reported — skip if
    // the owner is unknown or reported their own content (shouldn't happen,
    // but defensive).
    if (reportedUserId && String(reportedUserId) !== String(reporterId)) {
      try {
        await createNotification({
          title: "Content Reported",
          message: `Your ${contentType} has been reported and will be reviewed by an admin.`,
          notificationType: NOTIFICATION_TYPES.CONTENT_REPORTED,
          receiver: reportedUserId,
          metadata: { reportId: report._id, referenceId: contentId },
        });
      } catch (notifyErr) {
        console.error("Failed to notify content owner of report:", notifyErr.message);
      }
    }

    return report;
  } catch (err) {
    // Duplicate (E11000) just means it was already logged once — fine.
    if (err.code !== 11000) {
      console.error("Failed to write report log:", err.message);
    }
    return null;
  }
}

const CONTENT_TYPES = ["post", "comment", "deal", "event", "poll"];

function buildListFilter({ baseFilter, contentType }) {
  const filter = { ...baseFilter, isDeleted: false };
  if (contentType && contentType !== "all") {
    if (!CONTENT_TYPES.includes(contentType)) {
      throw Object.assign(new Error("Invalid contentType filter"), {
        status: 400,
      });
    }
    filter.contentType = contentType;
  }
  return filter;
}

export async function getSubmittedReports({ userId, contentType, page, limit }) {
  const filter = buildListFilter({ baseFilter: { reporterId: userId }, contentType });
  const skip = (page - 1) * limit;
  const [reports, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("reportedUserId", "fullName profilePhotoUrl")
      .lean(),
    Report.countDocuments(filter),
  ]);
  return { reports, total, page, hasMore: skip + reports.length < total };
}

export async function getReceivedReports({ userId, contentType, page, limit }) {
  const filter = buildListFilter({ baseFilter: { reportedUserId: userId }, contentType });
  const skip = (page - 1) * limit;
  const [reports, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("reporterId", "fullName profilePhotoUrl")
      .lean(),
    Report.countDocuments(filter),
  ]);
  return { reports, total, page, hasMore: skip + reports.length < total };
}

export async function getReportById(id) {
  return Report.findOne({ _id: id, isDeleted: false })
    .populate("reporterId", "fullName profilePhotoUrl")
    .populate("reportedUserId", "fullName profilePhotoUrl")
    .lean();
}

// Soft delete only — withdraws the reporter's own request without erasing
// it from the permanent audit log (isDeleted just hides it from their list).
export async function softDeleteOwnReport(id, userId) {
  const report = await Report.findById(id);
  if (!report) return { status: 404, error: "Report not found" };
  if (report.reporterId.toString() !== userId.toString()) {
    return { status: 403, error: "You can only delete your own report" };
  }
  report.isDeleted = true;
  await report.save();
  return { report };
}

export async function updateReportStatus(id, { status, adminNotes }) {
  if (!["pending", "reviewed", "closed"].includes(status)) {
    return { status: 400, error: "Invalid status" };
  }
  const update = { status };
  if (adminNotes !== undefined) update.adminNotes = adminNotes;
  if (status === "reviewed" || status === "closed") update.reviewedAt = new Date();
  const report = await Report.findByIdAndUpdate(id, update, { new: true });
  if (!report) return { status: 404, error: "Report not found" };
  return { report };
}
