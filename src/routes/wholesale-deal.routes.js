import express from "express";
import {
  createWholesaleDeal,
  getAllDealsBySocietyId,
  getDealById,
  getDealsByUserId,
  removeDeal,
  updateDeal,
  updateExpiredDeals,
} from "../controllers/wholesale-deal.controller.js";

const router = express.Router();

router.get("/getAllDeals/:societyId", getAllDealsBySocietyId);
router.get("/getDeal/:dealId", getDealById);
router.get("/getDealByUser/:userId", getDealsByUserId);
router.get("/updateExpired/:societyId", updateExpiredDeals);
router.post("/create", createWholesaleDeal);
router.patch("/:dealId", updateDeal);
router.delete("/:dealId", removeDeal);

export default router;
