// server/config/firebase.js
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

// Initialize Firebase Admin
let adminApp = null;

try {
  if (!admin.apps.length) {
    // Try to load service account key
    const serviceAccountPath = path.join(process.cwd(), 'config', 'serviceAccountKey.json');

    if (fs.existsSync(serviceAccountPath)) {
      // Use service account key file
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("Firebase Admin SDK initialized with service account");
    } else {
      // Try application default credentials
      adminApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      console.log("Firebase Admin SDK initialized with application default credentials");
    }
  } else {
    adminApp = admin.app();
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
  console.log("Firebase Admin SDK will be unavailable");
  console.log("To enable password reset functionality, please:");
  console.log("1. Download your Firebase service account key");
  console.log("2. Save it as config/serviceAccountKey.json");
  console.log("3. Restart the server");
}

const db = admin.firestore();

export { db, admin };
