import jwt from "jsonwebtoken";
import { getDb } from "../_db.js";

export default async function verifyOtpHandler(req, res, client) {
  try {
    let { phone, code } = req.body || {};
    const digits = String(phone || "").replace(/\D/g, "");
    const e164 = digits.length === 10 ? `+91${digits}` : String(phone || "");
    if (!/^\+\d{10,15}$/.test(e164) || !/^\d{4,8}$/.test(String(code || "")))
      return res.status(400).json({ error: "Invalid input" });

    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verificationChecks.create({ to: e164, code });

    if (!verificationCheck || verificationCheck.status !== "approved") {
      return res.status(401).json({ error: "Invalid code" });
    }

    const db = await getDb();
    const users = db.collection("users");
    const now = new Date();
    const up = await users.findOneAndUpdate(
      { phone: e164 },
      {
        $setOnInsert: { createdAt: now },
        $set: {
          lastLogin: now,
          phone: e164,
          isAddressVerified: false,
          roles: { resident: true },
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    if (!up || !up.value)
      return res.status(500).json({ error: "User update failed" });
    const user = up.value;

    const token = jwt.sign(
      { sub: String(user._id), phone: e164, roles: user.roles },
      process.env.JWT_SECRET || "default_secret",
      { algorithm: "HS256", expiresIn: "30d" }
    );

    return res.json({
      ok: true,
      token,
      user: {
        id: String(user._id),
        phone: e164,
        isAddressVerified: !!user.isAddressVerified,
        roles: user.roles,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
}
