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
  testPushNotification,
} from "../controllers/notification.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// Admin device token registration
router.post("/admin/register-token", authenticate, registerAdminToken);

// User device token registration (userId derived from the auth token —
// accepting it from the body let anyone hijack another user's pushes)
router.post("/user/register-token", authenticate, registerUserToken);

// User clicks reminder
router.post("/reminder", authenticate, createReminder);

// Admin-authored broadcast — society-wide or to selected users
router.post("/announcement", authenticate, sendAnnouncement);

// Developer test endpoint — send a real FCM push to a user by mobile number.
// Guarded: an open push trigger lets anyone spam notifications to any number.
router.post("/test", authenticate, testPushNotification);

// Notification list / read-state (scoped to the authenticated user)
router.get("/", authenticate, getNotifications);
router.get("/unread-count", authenticate, getUnreadCount);
router.patch("/read/:id", authenticate, markNotificationAsRead);
router.patch("/read-all", authenticate, markAllNotificationsAsRead);
router.delete("/:id", authenticate, deleteNotificationById);

export default router;
