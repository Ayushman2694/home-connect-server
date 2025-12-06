import express from "express";
import {
  createUser,
  getAllUserBySocietyId,
  getPendingUsersBySocietyId,
  getRequestByUserId,
  getUserById,
  syncUserBusinessIds,
  syncUserBusinessIdsWithStatus,
  updateUser,
} from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
const router = express.Router();

router.post("/", createUser);
router.get("/getUsers/:societyId", getAllUserBySocietyId);
router.get("/:userId/requests", getRequestByUserId);
router.patch("/:userId", updateUser);
// Get a single user by id
router.get("/:userId", getUserById);
router.get("/sync/:userId", syncUserBusinessIds);
router.get("/getPendingUsers/:societyId", getPendingUsersBySocietyId);
// Sync user's businessIds array with id and verificationStatus
router.put("/sync-status/:userId", authenticate, syncUserBusinessIdsWithStatus);

export default router;
