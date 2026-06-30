import { Router } from "express";
import {
  getMySubmittedReports,
  getReportsOnMyContent,
  getReport,
  deleteReport,
  patchReportStatus,
} from "../controllers/report.controller.js";

const router = Router();

// Matches the rest of this API's trust model (userId passed explicitly by
// the client, e.g. reportFeed/reportComment/reportDeal) rather than relying
// on the `authenticate` Bearer-token middleware, which none of the other
// report-writing routes use — mixing the two here caused reports to be
// written successfully but to silently fail to load on the "My Reports"
// screen whenever the bearer token wasn't present/valid for any reason.
router.get("/my-submitted", getMySubmittedReports);
router.get("/on-my-content", getReportsOnMyContent);
router.get("/:id", getReport);
router.delete("/:id", deleteReport);
router.patch("/:id/status", patchReportStatus);

export default router;
