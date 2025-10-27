import { Router } from "express";
import {
  createBusiness,
  updateBusiness,
  fetchBusinessBySocietyId,
  getProductById,
} from "../controllers/business.controller.js";

const router = Router();

// Create a new business
router.post("/", createBusiness);
router.get("/fetch/:societyId", fetchBusinessBySocietyId);
router.get("/product/:productId", getProductById);

// Update business
router.patch("/:businessId", updateBusiness);

export default router;
