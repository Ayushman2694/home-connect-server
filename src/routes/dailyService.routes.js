import { Router } from "express";
import {
  createDailyService,
  getAllDailyServicesBySocietyId,
  getAllApprovedDailyServices,
  getHelperById,
  updateDailyService,
  addDailyServiceReview,
} from "../controllers/daily-service.controller.js";

const router = Router();

// Create a new daily service
router.post("/create", createDailyService);
router.get("/approved/:societyId", getAllApprovedDailyServices);
router.get("/:helperId", getHelperById);
router.get("/all/:societyId", getAllDailyServicesBySocietyId);
router.post("/update/:helperId", updateDailyService);
// Add a review to a daily service
router.post("/:helperId/review", addDailyServiceReview);

export default router;
