import express from "express";
import {
  createUser,
  getAllUserBySocietyId,
  getPendingUsersBySocietyId,
  getRequestByUserId,
  getUserById,
  removeUser,
  syncUserBusinessIds,
  syncUserBusinessIdsWithStatus,
  updateUser,
  getUserOrders,
  reportUser,
  isUserBusinessAllowed,
} from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
const router = express.Router();

// All user routes require authentication — these expose PII (phone numbers,
// addresses) and createUser accepts role assignment, so leaving them open
// allowed unauthenticated user enumeration and privilege escalation.
router.post("/", authenticate, createUser);
router.get("/getUsers/:societyId", authenticate, getAllUserBySocietyId);
router.get("/:userId/requests", authenticate, getRequestByUserId);
router.get("/:userId/orders", authenticate, getUserOrders);
router.post("/report/:userId", authenticate, reportUser);
router.patch("/:userId", authenticate, updateUser);
// Get a single user by id
router.get("/:userId", authenticate, getUserById);
router.get("/sync/:userId", authenticate, syncUserBusinessIds);
router.get("/getPendingUsers/:societyId", authenticate, getPendingUsersBySocietyId);
router.get("/permission/:userId", authenticate, isUserBusinessAllowed);
router.put("/sync-status/:userId", authenticate, syncUserBusinessIdsWithStatus);
router.delete("/:userId", authenticate, removeUser);

export default router;
