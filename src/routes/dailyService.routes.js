import { Router } from "express";
import {
  createDailyService,
  getAllDailyServicesBySocietyId,
  getAllApprovedDailyServices,
  getHelperById,
  updateDailyService,
  addDailyServiceReview,
  reportDailyService,
  deleteDailyService,
} from "../controllers/daily-service.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// Create a new daily service
router.post("/create", createDailyService);
router.get("/approved/:societyId", getAllApprovedDailyServices);
router.get("/:helperId", getHelperById);
router.get("/all/:societyId", getAllDailyServicesBySocietyId);
router.post("/update/:helperId", authenticate, updateDailyService);
// Add a review to a daily service
router.post("/:helperId/review", addDailyServiceReview);
// Report a daily service helper
router.post("/report/:helperId", reportDailyService);
// Delete a daily service (creator or admin/super_admin — enforced in controller)
router.delete("/:helperId", authenticate, deleteDailyService);

export default router;
