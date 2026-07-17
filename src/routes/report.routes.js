import { Router } from "express";
import {
  getMySubmittedReports,
  getReportsOnMyContent,
  getReport,
  deleteReport,
  patchReportStatus,
} from "../controllers/report.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// Every route here reads or mutates moderation data tied to a specific user.
// Identity MUST come from the verified Bearer token (req.userId / req.user),
// not a client-supplied userId — otherwise anyone could read others' reports
// or, by borrowing a known admin id, moderate reports without a session.
router.get("/my-submitted", authenticate, getMySubmittedReports);
router.get("/on-my-content", authenticate, getReportsOnMyContent);
router.get("/:id", authenticate, getReport);
router.delete("/:id", authenticate, deleteReport);
router.patch("/:id/status", authenticate, patchReportStatus);

export default router;
