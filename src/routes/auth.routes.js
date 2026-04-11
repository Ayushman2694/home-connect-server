import express from "express";
import {
  sendOtp,
  verifyOtp,
  refreshToken,
  verifyTokenEndpoint,
} from "../controllers/auth.controller.js";
const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/refresh-token", refreshToken);
router.get("/verify-token", verifyTokenEndpoint);

export default router;
