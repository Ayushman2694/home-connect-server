import express from "express";
import {
  createRequest,
  getAllRequests,
  getRequestByType,
  updateRequestStatus,
} from "../controllers/request.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { USER_ROLES } from "../utils/constants.js";

const router = express.Router();

// Listing/approving verification requests exposes society-wide PII and mutates
// a user's verified status — restrict to authenticated admins / super admins.
const adminOnly = [
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
];

// router.get("/", getAllRequests);
// A user opens a verification request for themselves — identity comes from the
// token (see controller), never the request body.
router.post("/", authenticate, createRequest);
router.get("/:type", ...adminOnly, getRequestByType);
router.put("/:id", ...adminOnly, updateRequestStatus);

export default router;
