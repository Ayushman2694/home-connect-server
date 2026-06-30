import express from "express";
import {
  createReminder,
  registerAdminToken,
  registerUserToken,
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotificationById,
  sendAnnouncement,
} from "../controllers/notification.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// Admin device token registration
router.post("/admin/register-token", registerAdminToken);

// User device token registration
router.post("/user/register-token", registerUserToken);

// User clicks reminder
router.post("/reminder", createReminder);

// Admin-authored broadcast — society-wide or to selected users
router.post("/announcement", authenticate, sendAnnouncement);

// Notification list / read-state (scoped to the authenticated user)
router.get("/", authenticate, getNotifications);
router.get("/unread-count", authenticate, getUnreadCount);
router.patch("/read/:id", authenticate, markNotificationAsRead);
router.patch("/read-all", authenticate, markAllNotificationsAsRead);
router.delete("/:id", authenticate, deleteNotificationById);

export default router;
