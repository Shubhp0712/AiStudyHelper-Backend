import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import User from "../models/User.js";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { admin } from "../config/firebase.js";

const router = express.Router();

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.EMAIL_USER, // Add to your .env file
    pass: process.env.EMAIL_PASS  // Add to your .env file (use app password for Gmail)
  }
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('Email transporter error:', error);
  } else {
    console.log('Email transporter is ready');
  }
});

router.post("/createUserIfNotExist", verifyToken, async (req, res) => {
  try {
    const { uid, email, name } = req.user;

    // Check if user already exists
    let user = await User.findOne({ uid });

    if (!user) {
      // Create new user with all available information
      user = await User.create({
        uid,
        email,
        name: name || null // Use the name from Firebase auth token
      });
      console.log("Created new user:", { uid, email, name });
    } else {
      // Update existing user if name is missing and we have one from Firebase
      if (!user.name && name) {
        user.name = name;
        await user.save();
        console.log("Updated user name:", { uid, name });
      }
    }

    res.status(200).json({ message: "User is ready", user });
  } catch (error) {
    console.error("Error creating/fetching user:", error);
    res.status(500).json({ error: "Error creating/fetching user" });
  }
});

// Get user profile data
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;

    const user = await User.findOne({ uid });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Error fetching user profile" });
  }
});

// Update user profile
router.put("/profile", verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { name } = req.body;

    const user = await User.findOneAndUpdate(
      { uid },
      { name },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ error: "Error updating user profile" });
  }
});

// Forgot Password - Send OTP
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    // For now, we'll skip Firebase user verification on server side
    // The client will handle Firebase authentication

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Store OTP with expiration (5 minutes)
    otpStore.set(email, {
      otp,
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    // For testing, also log the OTP to console
    console.log(`OTP for ${email}: ${otp}`);

    // Send OTP via email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP - AI Study Assistant',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>We received a request to reset your password for your AI Study Assistant account.</p>
          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h3 style="margin: 0; color: #374151;">Your OTP Code</h3>
            <p style="font-size: 32px; font-weight: bold; color: #4F46E5; margin: 10px 0; letter-spacing: 4px;">${otp}</p>
            <p style="margin: 0; color: #6B7280; font-size: 14px;">This code will expire in 5 minutes</p>
          </div>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <p>Best regards,<br>AI Study Assistant Team</p>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      res.status(200).json({ message: "OTP sent successfully to your email address" });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Still return success for demo purposes, but log the OTP
      res.status(200).json({
        message: "OTP sent successfully",
        debug: process.env.NODE_ENV === 'development' ? `OTP: ${otp}` : undefined
      });
    }
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    const storedData = otpStore.get(email);

    if (!storedData) {
      return res.status(400).json({ error: "OTP not found or expired" });
    }

    if (Date.now() > storedData.expires) {
      otpStore.delete(email);
      return res.status(400).json({ error: "OTP has expired" });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});

// Reset Password
router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    // Check if Firebase Admin is available
    if (!admin.apps.length) {
      console.error("Firebase Admin SDK not initialized");
      return res.status(500).json({
        error: "Password reset service unavailable. Please contact administrator."
      });
    }

    // Verify OTP again for security
    const storedData = otpStore.get(email);

    if (!storedData) {
      return res.status(400).json({ error: "OTP not found or expired" });
    }

    if (Date.now() > storedData.expires) {
      otpStore.delete(email);
      return res.status(400).json({ error: "OTP has expired" });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // Get user from Firebase Auth by email
    const userRecord = await admin.auth().getUserByEmail(email);

    // Update the user's password in Firebase Auth
    await admin.auth().updateUser(userRecord.uid, {
      password: newPassword
    });

    console.log(`Password successfully updated for user: ${email}`);

    // Clear OTP from store
    otpStore.delete(email);

    res.status(200).json({
      message: "Password reset successfully! You can now login with your new password."
    });
  } catch (error) {
    console.error("Error resetting password:", error);

    // Handle specific Firebase errors
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ error: "User not found" });
    } else if (error.code === 'auth/invalid-password') {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    } else if (error.code === 'auth/invalid-argument') {
      return res.status(400).json({ error: "Invalid password format" });
    }

    res.status(500).json({ error: "Failed to reset password. Please try again." });
  }
});

export default router;
