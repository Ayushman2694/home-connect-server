import admin from "firebase-admin";
import fs from "fs";

/**
 * Load the Firebase service account.
 * - Production: provide it via env var (the JSON file is git-ignored and not
 *   deployed, so reading it at boot would crash the server).
 *     • FIREBASE_SERVICE_ACCOUNT_BASE64 — base64-encoded JSON (recommended;
 *       avoids newline/escaping issues with the private key).
 *     • FIREBASE_SERVICE_ACCOUNT — raw JSON string.
 * - Local dev: fall back to the git-ignored ./firebase-service.json if present.
 */
function loadServiceAccount() {
  const { FIREBASE_SERVICE_ACCOUNT_BASE64, FIREBASE_SERVICE_ACCOUNT } =
    process.env;

  try {
    if (FIREBASE_SERVICE_ACCOUNT_BASE64) {
      return JSON.parse(
        Buffer.from(FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf-8"),
      );
    }
    if (FIREBASE_SERVICE_ACCOUNT) {
      return JSON.parse(FIREBASE_SERVICE_ACCOUNT);
    }
    if (fs.existsSync("./firebase-service.json")) {
      return JSON.parse(fs.readFileSync("./firebase-service.json", "utf-8"));
    }
  } catch (err) {
    console.error("Failed to parse Firebase service account:", err.message);
  }
  return null;
}

const serviceAccount = loadServiceAccount();

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  // Boot without Firebase rather than crashing the whole server. Push
  // notification calls (admin.messaging()) will fail and are handled where used.
  console.warn(
    "⚠️ Firebase service account not configured. Set FIREBASE_SERVICE_ACCOUNT_BASE64 " +
      "to enable push notifications. Continuing without Firebase Admin.",
  );
}

export default admin;
