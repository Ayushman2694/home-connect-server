import { Router } from "express";
import {
  createBusiness,
  updateBusiness,
  fetchBusinessBySocietyId,
  getProductById,
  getAllBusinesses,
  getBusinessesByUserId,
  addCatalogueItem,
  getCatalogueByBusinessId,
  updateCatalogueItem,
  addOrUpdateBusinessReview,
} from "../controllers/business.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// Create a new business
router.post("/", createBusiness);
router.get("/fetch/:societyId", fetchBusinessBySocietyId);
router.get("/user/:userId", getBusinessesByUserId);
router.get("/product/:productId", getProductById);
router.get("/all/:societyId", getAllBusinesses);
router.get("/:businessId/catalogue", authenticate, getCatalogueByBusinessId);

// Update business
router.patch("/:businessId", updateBusiness);

// Add catalogue item to a business
router.post("/:businessId/catalogue", authenticate, addCatalogueItem);

// Update a catalogue item for a business
router.put(
  "/:businessId/catalogue/:catalogueId",
  authenticate,
  updateCatalogueItem
);
// Add or update a review for a business
router.post("/:businessId/review", authenticate, addOrUpdateBusinessReview);

export default router;
