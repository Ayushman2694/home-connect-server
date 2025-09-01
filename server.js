import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

const app = express();
app.use(bodyParser.json());

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ✅ Send OTP
app.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: phone, channel: "sms" })
      .then(verification => console.log(verification.sid));

    res.json({ success: true, status: verification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ Verify OTP
app.post("/verify-otp", async (req, res) => {
  try {
    const { phone, code } = req.body;
    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code });

    if (verificationCheck.status === "approved") {
      return res.json({ success: true, message: "OTP verified successfully" });
    } else {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 Server running on port ${process.env.PORT || 3000}`);
});
