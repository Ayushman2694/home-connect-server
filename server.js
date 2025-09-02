import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import twilio from "twilio";
import sendOtpHandler from "./api/auth/send-otp.ts";
import verifyOtpHandler from "./api/auth/verify-otp.ts";

dotenv.config();

const app = express();
app.use(bodyParser.json());

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Send OTP
app.post("/send-otp", (req, res) => sendOtpHandler(req, res, client));

// Verify OTP
app.post("/verify-otp", (req, res) => verifyOtpHandler(req, res, client));

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});
