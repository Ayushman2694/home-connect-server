import express from "express";
import {
  getUserOrders,
  upsertWholesaleOrder,
  upsertBusinessOrder,
} from "../controllers/orders.controller.js";

const router = express.Router();

// GET /api/orders/user/:userId?page=1&limit=20
router.get("/user/:userId", getUserOrders);
router.post("/wholesale/:dealId/upsert", upsertWholesaleOrder);
router.post("/business/:businessId/upsert", upsertBusinessOrder);

export default router;
