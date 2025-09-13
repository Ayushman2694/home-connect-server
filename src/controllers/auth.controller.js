
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
    let { phone, code } = req.body;
    const digits = String(phone || "").replace(/\D/g, "");
    const e164 = digits.length === 10 ? `+91${digits}` : String(phone || "");

    if (
      !/^\+\d{10,15}$/.test(e164) ||
      !/^\d{4,8}$/.test(String(code || ""))
    ) {
      return res.status(400).json({ error: "Invalid input" });
    }

    // --- OTP check (currently using master OTP for testing) ---
    const masterOTP = "123456";
    if (code != masterOTP) {
      return res.status(400).json({ error: "Invalid code" });
    }

    // ----- Check if user exists -----
    let user = await User.findOne({ phone: e164 });
    console.log("User found:", user);

    if (!user) {
      // 🔹 Create new user
      user = new User({
        phone: e164,
        fullName: "", // optional, can be filled later
        profilePic: null,
        isAddressVerified: false,
        roles: ["guest"], // or ["guest"] if you want
        lastLogin: new Date(),
      });

      await user.save();

      const token = generateToken(user);
      return res.json({
        success: true,
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
    }

    // ----- If user exists -----
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);
    console.log("Generated Token:", token);
    return res.json({
      success: true,
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
    res.status(500).json({
      success: false,
      error: `error in verifyOtp controller: ${error.message}`,
    });
  }
};
