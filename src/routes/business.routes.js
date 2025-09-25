import { Router } from "express";
import {
  createBusiness,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
} from "../controllers/business.controller.js";

const router = Router();

// Create a new business
router.post("/", createBusiness);

// Get business by ID
router.get("/:businessId", getBusinessById);

// Update business
router.patch("/:businessId", updateBusiness);

// Delete business
router.delete("/:businessId", deleteBusiness);

export default router;
