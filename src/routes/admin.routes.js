import { Router } from "express";
import {
  getAllReportedContent,
  getAllPendingContent,
  getAllApprovedContent,
} from "../controllers/admin.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// Fetch all reported content (users, businesses, feeds, deals, daily services)
router.get("/reported/:societyId", getAllReportedContent);

// Fetch all pending businesses, deals, residents, and daily services
router.get("/pending-requests/:societyId", getAllPendingContent);

// Fetch all approved residents, businesses, and daily services
router.get("/approved/:societyId", getAllApprovedContent);

export default router;
