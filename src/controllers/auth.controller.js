import twilio from "twilio";
import User from "../models/user.model.js";
import { generateToken, verifyToken } from "../utils/generateToken.js";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body || {};
    const digits = String(phone || "").replace(/\D/g, "");
    const e164 = digits.length === 10 ? `+91${digits}` : String(phone || "");
    if (!/^\+\d{10,15}$/.test(e164))
      return res.status(400).json({ error: "Invalid phone" });

    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: e164, channel: "sms" });

    res.json({
      success: true,
      status: verification.status,
      code: res.statusCode,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: `error in sendOtp controller: ${error.message}`,
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    let { phone, code } = req.body;
    const digits = String(phone || "").replace(/\D/g, "");
    const e164 = digits.length === 10 ? `+91${digits}` : String(phone || "");

    if (!/^\+\d{10,15}$/.test(e164) || !/^\d{4,8}$/.test(String(code || ""))) {
      return res.status(400).json({ error: "Invalid input" });
    }

    // --- OTP check (currently using master OTP for testing) ---
    const masterOTP = "123456";
    if (code != masterOTP) {
      return res.status(400).json({ error: "Invalid code" });
    }

    // ----- Check if user exists -----
    let user = await User.findOne({ phone: e164 }).populate({
      path: "societyId",
      select: "-towers -totalFlats -totalResidents",
    });

    if (!user) {
      // 🔹 Create new user
      user = new User({
        phone: e164,
        fullName: "", // optional, can be filled later
        profilePic: null,
        isAddressVerified: "pending",
        roles: ["guest"], // or ["guest"] if you want
        societyId: null,
        businessIds: null,
        tower: null,
        lastLogin: new Date(),
      });

      await user.save();

      const token = generateToken(user);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 60); // 60 days from now

      return res.json({
        success: true,
        code: res.statusCode,
        token,
        expiresAt,
        message: "New user registered successfully",
        user,
      });
    }

    // ----- If user exists -----
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60); // 60 days from now

    console.log("Generated Token:", token);
    return res.json({
      success: true,
      code: res.statusCode,
      token,
      expiresAt,
      message: "Login successful",
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      code: res.statusCode,
      error: `error in verifyOtp controller: ${error.message}`,
    });
  }
};

// Token refresh endpoint
export const refreshToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        code: 401,
        error: "No token provided",
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    // Get updated user data
    const user = await User.findById(decoded.userId)
      .populate({
        path: "societyId",
        select: "-towers -totalFlats -totalResidents",
      })
      .select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        code: 401,
        error: "User not found",
      });
    }

    // Generate new token
    const newToken = generateToken(user);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);

    res.json({
      success: true,
      code: res.statusCode,
      token: newToken,
      expiresAt,
      message: "Token refreshed successfully",
      user,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(401).json({
      success: false,
      code: 401,
      error: "Invalid or expired token",
    });
  }
};

// Verify if current token is valid
export const verifyTokenEndpoint = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        code: 401,
        error: "No token provided",
        isValid: false,
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.userId)
      .populate({
        path: "societyId",
        select: "-towers -totalFlats -totalResidents",
      })
      .select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        code: 401,
        error: "User not found",
        isValid: false,
      });
    }

    res.json({
      success: true,
      code: res.statusCode,
      message: "Token is valid",
      isValid: true,
      user,
      tokenExpiry: new Date(decoded.exp * 1000),
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({
      success: false,
      code: 401,
      error: "Invalid or expired token",
      isValid: false,
    });
  }
};
