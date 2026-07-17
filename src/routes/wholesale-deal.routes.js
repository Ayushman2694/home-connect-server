import express from "express";
import {
  createWholesaleDeal,
  getAllDealsBySocietyId,
  getDealById,
  getDealsByUserId,
  removeDeal,
  updateDeal,
  updateExpiredDeals,
  reportDeal,
  getDealPostingAccountsByUserId,
} from "../controllers/wholesale-deal.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/getAllDeals/:societyId", getAllDealsBySocietyId);
router.get("/getDeal/:dealId", getDealById);
router.get("/getDealByUser/:userId", getDealsByUserId);
router.get("/updateExpired/:societyId", updateExpiredDeals);
router.get("/posting-accounts/:userId", getDealPostingAccountsByUserId);
router.post("/create", authenticate, createWholesaleDeal);
router.post("/report/:dealId", authenticate, reportDeal);
router.patch("/:dealId", authenticate, updateDeal);
router.delete("/:dealId", authenticate, removeDeal);

export default router;
