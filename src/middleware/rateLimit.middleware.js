import rateLimit from "express-rate-limit";

// Shared options: return JSON (matching the rest of the API) and expose the
// standard RateLimit-* headers so clients can back off gracefully.
const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
};

// OTP send is the most abusable endpoint — each hit spends real money via
// Twilio SMS. Keep this tight (per client IP).
export const sendOtpLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    code: 429,
    error: "Too many OTP requests. Please wait a few minutes and try again.",
  },
});

// OTP verification — throttle to blunt brute-forcing of the 4–8 digit code.
export const verifyOtpLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    code: 429,
    error: "Too many verification attempts. Please wait a few minutes and try again.",
  },
});
