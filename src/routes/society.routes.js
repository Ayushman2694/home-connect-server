import express from "express";
import {
  getSocietiesByPincode,
  getAllSocieties,
  getTotalResidents,
} from "../controllers/society.controller.js";
const router = express.Router();

// Route to get all societies
router.get("/all", getAllSocieties);
router.get("/:pincode", getSocietiesByPincode);
router.get("/total-residents/count", getTotalResidents);

export default router;
