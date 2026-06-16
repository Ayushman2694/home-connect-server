import express from "express";
import {
  getAllSocieties,
  getTotalResidents,
  getSocietyById,
  getSocietiesByCityOrState,
} from "../controllers/society.controller.js";
const router = express.Router();

// Route to get all societies
router.get("/all", getAllSocieties);
router.get("/byCityState", getSocietiesByCityOrState);
router.get("/total-residents/count", getTotalResidents);

export default router;
