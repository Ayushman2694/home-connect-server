import express from "express";
import {
  sendOtp,
  verifyOtp,
  refreshToken,
  verifyTokenEndpoint,
} from "../controllers/auth.controller.js";
import {
  sendOtpLimiter,
  verifyOtpLimiter,
} from "../middleware/rateLimit.middleware.js";
const router = express.Router();

router.post("/send-otp", sendOtpLimiter, sendOtp);
router.post("/verify-otp", verifyOtpLimiter, verifyOtp);
router.post("/refresh-token", refreshToken);
router.get("/verify-token", verifyTokenEndpoint);

export default router;
