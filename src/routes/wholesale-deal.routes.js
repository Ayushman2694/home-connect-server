import express from "express";
import { createWholesaleDeal } from "../controllers/wholesale-deal.controller.js";

const router = express.Router();

router.post("/", createWholesaleDeal);

export default router;
