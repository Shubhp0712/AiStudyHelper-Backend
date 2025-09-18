// middleware/authMiddleware.js
import { admin, isFirebaseInitialized } from "../config/firebase.js";

export async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    if (!isFirebaseInitialized || !admin || !admin.apps.length) {
      console.warn("⚠️ Firebase not initialized - skipping token verification");
      return res.status(500).json({ message: "Authentication service unavailable" });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    req.user = decodedToken;
    next();
  } catch (err) {
    console.error("Firebase token verification failed:", err);
    res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
}
