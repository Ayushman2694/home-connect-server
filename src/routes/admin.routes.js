import { Router } from "express";
import {
  getAllReportedContent,
  getAllPendingContent,
  getAllApprovedContent,
} from "../controllers/admin.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { USER_ROLES } from "../utils/constants.js";

const router = Router();

// Every admin endpoint exposes society-wide PII and moderation data — restrict
// to authenticated admins / super admins only.
const adminOnly = [
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
];

// Fetch all reported content (users, businesses, feeds, deals, daily services)
router.get("/reported/:societyId", ...adminOnly, getAllReportedContent);

// Fetch all pending businesses, deals, residents, and daily services
router.get("/pending-requests/:societyId", ...adminOnly, getAllPendingContent);

// Fetch all approved residents, businesses, and daily services
router.get("/approved/:societyId", ...adminOnly, getAllApprovedContent);

export default router;
