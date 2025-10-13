import { Router } from "express";
import {
  createBusiness,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
  getAllBusinesses,
  fetchBusinessBySocietyId,
  getProductById,
} from "../controllers/business.controller.js";

const router = Router();

// Create a new business
router.post("/", createBusiness);
router.get("/all", getAllBusinesses);
router.get("/fetch/:societyId", fetchBusinessBySocietyId);
router.get("/product/:productId", getProductById);

// Get business by user ID
router.get("/:userId", getBusinessById);

// Update business
router.patch("/:businessId", updateBusiness);

// Delete business
router.delete("/:businessId", deleteBusiness);

export default router;
