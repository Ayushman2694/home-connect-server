import { Router } from "express";
import {
  createDailyService,
  getAllDailyServices,
} from "../controllers/daily-service.controller.js";

const router = Router();

// Create a new daily service
router.post("/create", createDailyService);
router.get("/all", getAllDailyServices);

export default router;
