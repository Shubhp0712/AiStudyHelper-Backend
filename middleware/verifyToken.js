import { admin, isFirebaseInitialized } from "../config/firebase.js";
import { getAuth } from "firebase-admin/auth";

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    if (!isFirebaseInitialized || !admin || !admin.apps.length) {
      console.warn("⚠️ Firebase not initialized - skipping token verification");
      // For development without Firebase, you can either:
      // 1. Skip authentication (not recommended for production)
      // 2. Return error (recommended)
      return res.status(500).json({ error: "Authentication service unavailable" });
    }

    const decodedToken = await getAuth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
