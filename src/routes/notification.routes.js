import express from "express";
import { createReminder, registerAdminToken, registerUserToken } from "../controllers/notification.controller.js";


const router = express.Router();

// Admin device token registration
router.post("/admin/register-token", registerAdminToken);

// User device token registration
router.post("/user/register-token", registerUserToken);

// User clicks reminder
router.post("/reminder", createReminder);

export default router;

