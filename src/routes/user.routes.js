import express from "express";
import { createUser, getAllUsers, getRequestByUserId, updateUser } from "../controllers/user.controller.js";
const router = express.Router();

router.post("/", createUser);
router.get("/", getAllUsers);
router.get("/:userId/requests", getRequestByUserId);
router.patch("/update/:userId",updateUser)

export default router;