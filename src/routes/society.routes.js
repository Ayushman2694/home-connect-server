import express from "express";
import {
  getSocietiesByPincode,
  getAllSocieties,
} from "../controllers/society.controller.js";
const router = express.Router();

// Route to get all societies
router.get("/all", getAllSocieties);
router.get("/:pincode", getSocietiesByPincode);

export default router;
