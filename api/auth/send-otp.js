export default async function sendOtpHandler(req, res, client) {
    try {
        const { phone } = req.body || {};
        const digits = String(phone || "").replace(/\D/g, "");
        const e164 = digits.length === 10 ? `+91${digits}` : String(phone || ""); // tweak for multi-country
        if (!/^\+\d{10,15}$/.test(e164)) return res.status(400).json({ error: "Invalid phone" });


        const verification = await client.verify.v2
            .services(process.env.TWILIO_VERIFY_SID)
            .verifications.create({ to: e164, channel: "sms" });

        res.json({ success: true, status: verification.status });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
}