import { Router } from "express";
import {
  createDailyService,
  getAllDailyServicesBySocietyId,
  getHelperById,
  updateDailyService,
} from "../controllers/daily-service.controller.js";

const router = Router();

// Create a new daily service
router.post("/create", createDailyService);
router.get("/:helperId", getHelperById);
router.get("/all/:societyId", getAllDailyServicesBySocietyId);
router.post("/update/:helperId", updateDailyService);

export default router;
