import express from "express";
import {
  getUserOrders,
  upsertWholesaleOrder,
  upsertBusinessOrder,
  getEventRegistrations,
  getUserEventOrders,
} from "../controllers/orders.controller.js";

const router = express.Router();

// GET /api/orders/user/:userId?page=1&limit=20
// Returns all orders (wholesale, business, and event registrations)
router.get("/user/:userId", getUserOrders);

// GET /api/orders/user/:userId/events?page=1&limit=20
// Returns only event registrations for a user
router.get("/user/:userId/events", getUserEventOrders);

// GET /api/orders/event/:eventId/registrations?page=1&limit=20
// Returns all registered participants for a specific event
router.get("/event/:eventId/registrations", getEventRegistrations);

router.post("/wholesale/:dealId/upsert", upsertWholesaleOrder);
router.post("/business/:businessId/upsert", upsertBusinessOrder);

export default router;
