import express from "express";
import { createUser, getAllUsers, getRequestByUserId } from "../controllers/user.controller.js";
const router = express.Router();

router.post("/", createUser);
router.get("/", getAllUsers);
router.get("/:userId/requests", getRequestByUserId);

export default router;