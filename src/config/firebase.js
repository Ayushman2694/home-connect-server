import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve the service account file relative to this config file's directory
// so the path is correct regardless of the process working directory.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, "../../firebase-service.json");

function loadServiceAccount() {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    throw new Error(
      `Firebase service account not found at ${SERVICE_ACCOUNT_PATH}. ` +
        "Download it from Firebase Console → Project Settings → Service Accounts " +
        "and place it at the project root as firebase-service.json.",
    );
  }

  let raw;
  try {
    raw = fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf-8");
  } catch (err) {
    throw new Error(`Failed to read firebase-service.json: ${err.message}`);
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`firebase-service.json contains invalid JSON: ${err.message}`);
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
