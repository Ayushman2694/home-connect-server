import express from "express";
import {
  sendOtp,
  verifyOtp,
  refreshToken,
  verifyTokenEndpoint,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/refresh-token", refreshToken);
router.get("/verify-token", verifyTokenEndpoint);

// Protected route example
router.get("/me", authenticate, (req, res) => {
  res.json({
    success: true,
    code: res.statusCode,
    message: "User profile retrieved",
    user: req.user,
  });
});

export default router;
