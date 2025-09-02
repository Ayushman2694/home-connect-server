
import twilio from "twilio";
import User from "../models/user.model.js";
import { generateToken } from "../utils/generateToken.js";

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendOtp = async(req, res) => {
    try {
        const { phone } = req.body || {};
        const digits = String(phone || "").replace(/\D/g, "");
        const e164 = digits.length === 10 ? `+91${digits}` : String(phone || ""); 
        if (!/^\+\d{10,15}$/.test(e164)) return res.status(400).json({ error: "Invalid phone" });


        const verification = await client.verify.v2
            .services(process.env.TWILIO_VERIFY_SERVICE_SID)
            .verifications.create({ to: e164, channel: "sms" });

        res.json({ success: true, status: verification.status });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: `error in sendOtp controller: ${error.message}` });
    }
}

export const verifyOtp = async (req, res) => {
  try {
    let { phone, code } = req.body || {};
    const digits = String(phone || "").replace(/\D/g, "");
    const e164 = digits.length === 10 ? `+91${digits}` : String(phone || "");

    if (
      !/^\+\d{10,15}$/.test(e164) ||
      !/^\d{4,8}$/.test(String(code || ""))
    ) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: e164, code });

    if (!verificationCheck || verificationCheck.status !== "approved") {
      return res.status(401).json({ error: "Invalid code" });
    }

    // ----- Check if user exists -----
    let user = await User.findOne({ phone: e164 });

    if (!user) {
      // return guest profile
      return res.json({
        success: true,
        guest: true,
        user: {
          phone: e164,
          isGuest: true,
          message: "User not registered. Guest profile returned.",
        },
      });
    }

    // ----- If user exists -----
    user.lastLogin = new Date();
    await user.save();

    const token = await generateToken(user);
    console.log("Generated Token:", token);
    return res.json({
      success: true,
      guest: false,
      token,
      user: {
        id: String(user._id),
        phone: user.phone,
        fullName: user.fullName,
        profilePic: user.profilePic,
        isAddressVerified: user.isAddressVerified,
        roles: user.roles,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: `error in verifyOtp controller: ${error.message}` });
  }
};