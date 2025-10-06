import { Router } from "express";
import {
  createBusiness,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
  getAllBusinesses,
} from "../controllers/business.controller.js";

const router = Router();

// Create a new business
router.post("/", createBusiness);
router.get("/all", getAllBusinesses);

// Get business by user ID
router.get("/:userId", getBusinessById);

// Update business
router.patch("/:businessId", updateBusiness);

// Delete business
router.delete("/:businessId", deleteBusiness);

export default router;
