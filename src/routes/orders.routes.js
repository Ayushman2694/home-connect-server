import express from "express";
import {
  getUserOrders,
  upsertWholesaleOrder,
  upsertBusinessOrder,
  getEventRegistrations,
  getUserEventOrders,
  updateOrderStatus,
} from "../controllers/orders.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// All order routes require authentication — they expose/modify financial data.

// GET /api/orders/user/:userId?page=1&limit=20
// Returns all orders (wholesale, business, and event registrations)
router.get("/user/:userId", authenticate, getUserOrders);

// GET /api/orders/user/:userId/events?page=1&limit=20
// Returns only event registrations for a user
router.get("/user/:userId/events", authenticate, getUserEventOrders);

// GET /api/orders/event/:eventId/registrations?page=1&limit=20
// Returns all registered participants for a specific event
router.get("/event/:eventId/registrations", authenticate, getEventRegistrations);

router.post("/wholesale/:dealId/upsert", authenticate, upsertWholesaleOrder);
router.post("/business/:businessId/upsert", authenticate, upsertBusinessOrder);

// PATCH /api/orders/wholesale/:dealId/orders/:orderId/status
// Updates individual order status and recalculates deal lifecycle
router.patch("/wholesale/:dealId/orders/:orderId/status", authenticate, updateOrderStatus);

export default router;

