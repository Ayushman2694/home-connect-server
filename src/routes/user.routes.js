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
} from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
const router = express.Router();

router.post("/", createUser);
router.get("/getUsers/:societyId", getAllUserBySocietyId);
router.get("/:userId/requests", getRequestByUserId);
router.get("/:userId/orders", authenticate, getUserOrders);
router.post("/report/:userId", authenticate, reportUser);
router.patch("/:userId", updateUser);
// Get a single user by id
router.get("/:userId", getUserById);
router.get("/sync/:userId", syncUserBusinessIds);
router.get("/getPendingUsers/:societyId", getPendingUsersBySocietyId);
router.put("/sync-status/:userId", authenticate, syncUserBusinessIdsWithStatus);
router.delete("/:userId", authenticate, removeUser);

export default router;
