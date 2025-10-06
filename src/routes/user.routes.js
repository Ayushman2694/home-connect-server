import express from "express";
import {
  createUser,
  getAllUsers,
  getRequestByUserId,
  getUserById,
  syncUserBusinessIds,
  updateUser,
} from "../controllers/user.controller.js";
const router = express.Router();

router.post("/", createUser);
// router.get("/", getAllUsers);
router.get("/:userId/requests", getRequestByUserId);
router.patch("/:userId", updateUser);
// Get a single user by id
router.get("/:userId", getUserById);
router.get("/sync/:userId", syncUserBusinessIds);

export default router;
