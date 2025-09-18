// server/config/firebase.js
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

// Initialize Firebase Admin
let adminApp = null;
let db = null;
let isFirebaseInitialized = false;

try {
  if (!admin.apps.length) {
    let credential = null;

    // Method 1: Try environment variables first (for Render deployment)
    const hasEnvVars = process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_CLIENT_EMAIL;

    const isValidEnvVars = hasEnvVars &&
      !process.env.FIREBASE_PROJECT_ID.includes('your-project-id') &&
      !process.env.FIREBASE_PRIVATE_KEY.includes('sample+key+content+here') &&
      !process.env.FIREBASE_CLIENT_EMAIL.includes('xxxxx');

    if (isValidEnvVars) {
      console.log("Using Firebase credentials from environment variables");
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      });
    }
    // Method 2: Try service account key file (for local development)
    else {
      // Try config/serviceAccountKey.json first
      let serviceAccountPath = path.join(process.cwd(), 'config', 'serviceAccountKey.json');

      // If not found, try server root directory
      if (!fs.existsSync(serviceAccountPath)) {
        serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
      }

      if (fs.existsSync(serviceAccountPath)) {
        console.log(`Using Firebase credentials from: ${serviceAccountPath}`);
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        credential = admin.credential.cert(serviceAccount);
      }
    }

    if (credential) {
      adminApp = admin.initializeApp({
        credential: credential,
      });
      db = admin.firestore();
      isFirebaseInitialized = true;
      console.log("✅ Firebase Admin SDK initialized successfully");
    } else {
      console.warn("⚠️ Firebase Admin SDK not initialized - continuing without authentication");
      console.log("🔧 Firebase features will be disabled. To enable them:");
      console.log("For production deployment:");
      console.log("  - Set valid FIREBASE_PROJECT_ID environment variable");
      console.log("  - Set valid FIREBASE_PRIVATE_KEY environment variable");
      console.log("  - Set valid FIREBASE_CLIENT_EMAIL environment variable");
      console.log("For local development:");
      console.log("  - Download your real Firebase service account key");
      console.log("  - Save it as config/serviceAccountKey.json");
      console.log("  - Restart the server");
    }
  } else {
    adminApp = admin.app();
    db = admin.firestore();
    isFirebaseInitialized = true;
  }
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin:", error.message);
  console.log("🔧 Server will continue without Firebase authentication features");
}

export { db, admin, isFirebaseInitialized };
