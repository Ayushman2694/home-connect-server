import express from "express";
import { getSocietiesByPincode } from "../controllers/society.controller.js";
const router = express.Router();

router.get("/:pincode", getSocietiesByPincode);

export default router;