import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Candidate locations for the service account file, in priority order:
//  1. Render "Secret Files" mount (runtime)        → /etc/secrets/firebase-service.json
//  2. Explicit override                            → FIREBASE_SERVICE_ACCOUNT_PATH
//  3. Project-root copy (local dev, git-ignored)   → ../../firebase-service.json
const SERVICE_ACCOUNT_PATHS = [
  "/etc/secrets/firebase-service.json",
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  path.resolve(__dirname, "../../firebase-service.json"),
].filter(Boolean);

function loadServiceAccount() {
  const filePath = SERVICE_ACCOUNT_PATHS.find((p) => fs.existsSync(p));
  if (!filePath) {
    throw new Error(
      "Firebase service account not found. Looked in: " +
        `${SERVICE_ACCOUNT_PATHS.join(", ")}. ` +
        "On Render, add it under Environment → Secret Files as " +
        "'firebase-service.json'. Locally, place it at the project root.",
    );
  }

  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    throw new Error(`Failed to read firebase-service.json: ${err.message}`);
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `firebase-service.json contains invalid JSON: ${err.message}`,
    );
  }
}

// Only initialize once — guard against hot-module re-evaluation in dev
if (!admin.apps.length) {
  let serviceAccount;
  try {
    serviceAccount = loadServiceAccount();
  } catch (err) {
    // Log clearly and exit — the server cannot send push notifications without
    // valid Firebase credentials. Swallowing this would silently break pushes.
    console.error("❌ Firebase Admin initialization failed:", err.message);
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log(
    `✅ Firebase Admin initialized (project: ${serviceAccount.project_id || "unknown"})`,
  );
}

export default admin;
