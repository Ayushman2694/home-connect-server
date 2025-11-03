import { Router } from "express";
import {
  createBusiness,
  updateBusiness,
  fetchBusinessBySocietyId,
  getProductById,
  getAllBusinesses,
} from "../controllers/business.controller.js";

const router = Router();

// Create a new business
router.post("/", createBusiness);
router.get("/fetch/:societyId", fetchBusinessBySocietyId);
router.get("/product/:productId", getProductById);
router.get("/all/:societyId", getAllBusinesses);

// Update business
router.patch("/:businessId", updateBusiness);

export default router;
