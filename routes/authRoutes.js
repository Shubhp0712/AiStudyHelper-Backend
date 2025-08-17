import express from "express";
import { verifyToken } from "../middleware/verifyToken.js"; 
import User from "../models/User.js";

const router = express.Router();

router.post("/createUserIfNotExist", verifyToken, async (req, res) => {
  const { uid, email, name } = req.user;

  try {
    let user = await User.findOne({ uid });

    if (!user) {
      user = await User.create({ uid, email, name });
    }

    res.status(200).json({ message: "User is ready", user });
  } catch (error) {
    res.status(500).json({ error: "Error creating/fetching user" });
  }
});

export default router;
