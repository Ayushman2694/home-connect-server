import express from "express";
import { createReminder, registerAdminToken } from "../controllers/notification.controller.js";


const router = express.Router();

// Admin device token registration
router.post("/admin/register-token", registerAdminToken);

// User clicks reminder
router.post("/reminder", createReminder);

export default router;
