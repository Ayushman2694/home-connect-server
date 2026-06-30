import mongoose from "mongoose";
import User from "../models/user.model.js";
import {
  getSubmittedReports,
  getReceivedReports,
  getReportById,
  softDeleteOwnReport,
  updateReportStatus,
} from "../services/report.service.js";
import { createNotification } from "../services/notification.service.js";
import { NOTIFICATION_TYPES } from "../utils/constants.js";

function parsePagination(req) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
  return { page, limit };
}

async function isAdminUser(userId) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return false;
  const user = await User.findById(userId).select("roles").lean();
  return (
    Array.isArray(user?.roles) &&
    (user.roles.includes("admin") || user.roles.includes("super_admin"))
  );
}

// GET /api/reports/my-submitted?userId=...
export const getMySubmittedReports = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid userId is required", code: res.statusCode });
    }
    const { page, limit } = parsePagination(req);
    const result = await getSubmittedReports({
      userId,
      contentType: req.query.contentType,
      page,
      limit,
    });
    res.json({ success: true, ...result, code: res.statusCode });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ success: false, message: error.message, code: res.statusCode });
  }
};

// GET /api/reports/on-my-content?userId=...
export const getReportsOnMyContent = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid userId is required", code: res.statusCode });
    }
    const { page, limit } = parsePagination(req);
    const result = await getReceivedReports({
      userId,
      contentType: req.query.contentType,
      page,
      limit,
    });
    res.json({ success: true, ...result, code: res.statusCode });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ success: false, message: error.message, code: res.statusCode });
  }
};

// GET /api/reports/:id?userId=...
export const getReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid report id", code: res.statusCode });
    }
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid userId is required", code: res.statusCode });
    }
    const report = await getReportById(id);
    if (!report) {
      return res
        .status(404)
        .json({ success: false, message: "Report not found", code: res.statusCode });
    }
    // Only the reporter, the reported owner, or an admin may view a report.
    const isParty =
      report.reporterId?._id?.toString() === userId ||
      report.reportedUserId?._id?.toString() === userId;
    if (!isParty && !(await isAdminUser(userId))) {
      return res
        .status(403)
        .json({ success: false, message: "Access forbidden", code: res.statusCode });
    }
    res.json({ success: true, report, code: res.statusCode });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message, code: res.statusCode });
  }
};

// DELETE /api/reports/:id — withdraw a report you filed (soft delete only;
// never removes the original reported content). Body: { userId }
export const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid report id", code: res.statusCode });
    }
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "userId is required", code: res.statusCode });
    }
    const result = await softDeleteOwnReport(id, userId);
    if (result.error) {
      return res
        .status(result.status)
        .json({ success: false, message: result.error, code: res.statusCode });
    }
    res.json({ success: true, message: "Report deleted", code: res.statusCode });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message, code: res.statusCode });
  }
};

// PATCH /api/reports/:id/status — admin moderation only. Body: { userId, status, adminNotes }
export const patchReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, status, adminNotes } = req.body;
    if (!(await isAdminUser(userId))) {
      return res
        .status(403)
        .json({ success: false, message: "Admin access required", code: res.statusCode });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid report id", code: res.statusCode });
    }
    const result = await updateReportStatus(id, { status, adminNotes });
    if (result.error) {
      return res
        .status(result.status)
        .json({ success: false, message: result.error, code: res.statusCode });
    }
    res.json({ success: true, report: result.report, code: res.statusCode });

    const statusNotificationType = {
      reviewed: NOTIFICATION_TYPES.REPORT_REVIEWED,
      closed: NOTIFICATION_TYPES.REPORT_RESOLVED,
    }[status];
    if (statusNotificationType && result.report?.reporterId) {
      try {
        await createNotification({
          title: status === "reviewed" ? "Report Reviewed" : "Report Resolved",
          message: `Your report has been ${status === "reviewed" ? "reviewed" : "resolved"} by an admin.`,
          notificationType: statusNotificationType,
          sender: userId,
          receiver: result.report.reporterId,
          metadata: { reportId: result.report._id },
        });
      } catch (err) {
        console.error("Failed to notify reporter of report status update:", err);
      }
    }
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: error.message, code: res.statusCode });
  }
};
