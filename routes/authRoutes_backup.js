import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import User from "../models/User.js";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { admin } from "../config/firebase.js";

const router = express.Router();

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();

// Simple and reliable Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

console.log('📧 Email User:', process.env.EMAIL_USER);
console.log('🔑 Email Pass Length:', process.env.EMAIL_PASS?.length, 'characters');
console.log('✅ Testing email connection with new app password...');

// Test email connection asynchronously (non-blocking)
transporter.verify()
  .then(() => {
    console.log('✅ Gmail connection successful - OTP emails will work!');
  })
  .catch((error) => {
    console.error('❌ Gmail connection failed:', error.message);
    if (error.code === 'EAUTH') {
      console.error('🔑 Authentication failed - check your app password');
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

// Debug endpoint to check OTP (only for development)
router.get("/debug-otp/:email", (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: "Not found" });
  }
  
  const { email } = req.params;
  const storedData = otpStore.get(email);
  
  if (!storedData) {
    return res.json({ email, otp: null, message: "No OTP found" });
  }
  
  const isExpired = Date.now() > storedData.expires;
  const timeLeft = Math.max(0, Math.floor((storedData.expires - Date.now()) / 1000));
  
  res.json({ 
    email, 
    otp: storedData.otp, 
    expired: isExpired,
    timeLeft: timeLeft + " seconds"
  });
});

// Test email endpoint for debugging
router.post("/test-email", async (req, res) => {
  const { email } = req.body;
  
  console.log(`🧪 Testing email to: ${email}`);
  
  try {
    const testMailOptions = {
      from: `"AI Study Assistant Test" <${process.env.EMAIL_USER}>`,
      to: email || 'shubhgugada0712@gmail.com',
      subject: 'Test Email - AI Study Assistant',
      text: 'This is a simple test email to verify email configuration is working.',
      html: '<h2>Test Email</h2><p>This is a simple test email to verify email configuration is working.</p>'
    };

    console.log('📤 Sending test email...');
    const startTime = Date.now();
    
    await transporter.sendMail(testMailOptions);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Test email sent successfully in ${duration}ms`);
    res.json({ 
      success: true, 
      message: 'Test email sent successfully',
      duration: duration + 'ms'
    });
    
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      code: error.code 
    });
  }
});

// Forgot Password - Send OTP
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  console.log(`🔐 Password reset request for: ${email}`);

  try {
    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Store OTP with expiration (5 minutes)
    otpStore.set(email, {
      otp,
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    // ALWAYS log the OTP to console for testing
    console.log(`� Generated OTP for ${email}: ${otp} (expires in 5 minutes)`);

    // Try to send email immediately
    try {
      const mailOptions = {
        from: `"AI Study Assistant" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset OTP - AI Study Assistant',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4F46E5;">🔐 Password Reset Request</h2>
            <p>Hello!</p>
            <p>We received a request to reset your password for your AI Study Assistant account.</p>
            <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #4F46E5;">
              <h3 style="margin: 0; color: #374151;">Your OTP Code</h3>
              <h1 style="font-size: 36px; color: #4F46E5; margin: 10px 0; letter-spacing: 4px; font-family: monospace;">${otp}</h1>
              <p style="margin: 0; color: #6B7280; font-size: 14px;">⏰ This code expires in 5 minutes</p>
            </div>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <p>Best regards,<br>AI Study Assistant Team</p>
          </div>
        `,
        text: `Your password reset OTP for AI Study Assistant is: ${otp}. This code will expire in 5 minutes.`
      };

      console.log(`📤 Sending OTP email to ${email}...`);
      await transporter.sendMail(mailOptions);
      console.log(`✅ OTP email sent successfully to ${email}`);
      
      res.status(200).json({ 
        message: "OTP sent successfully to your email address",
        note: "Check your email inbox and spam folder for the OTP code"
      });
      
    } catch (emailError) {
      console.error(`❌ Email sending failed:`, emailError.message);
      if (emailError.code === 'EAUTH') {
        console.error('🔑 Gmail authentication failed - check your EMAIL_PASS in .env file');
      }
      
      // Return success but note email failed
      console.log(`📱 EMAIL FAILED - Use this OTP: ${otp}`);
      res.status(200).json({
        message: "OTP generated (email delivery failed)",
        note: "Check server console for OTP code",
        debug: `Console OTP: ${otp}`
      });
    }

    // Try to send email in background (non-blocking)
    const mailOptions = {
      from: `"AI Study Assistant" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset OTP - AI Study Assistant',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4F46E5;">Password Reset Request</h2>
          <p>Your OTP code is:</p>
          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="font-size: 36px; color: #4F46E5; margin: 0; letter-spacing: 4px;">${otp}</h1>
            <p style="margin: 10px 0; color: #6B7280;">This code expires in 5 minutes</p>
          </div>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
      text: `Your password reset OTP is: ${otp}. This code will expire in 5 minutes.`
    };

    // Send email in background with strict timeout
    setTimeout(async () => {
      try {
        console.log(`📤 Attempting to send OTP email to ${email}...`);
        
        const emailPromise = transporter.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email timeout')), 3000)
        );

        await Promise.race([emailPromise, timeoutPromise]);
        console.log(`✅ OTP email sent successfully to ${email}`);
        
      } catch (emailError) {
        console.error(`❌ Failed to send email to ${email}:`, emailError.message);
        console.log(`� OTP for ${email} (email failed): ${otp}`);
        
        if (emailError.code === 'EAUTH') {
          console.error('🔑 Gmail authentication issue - check app password');
        }
      }
    }, 100); // Send in background after 100ms

  } catch (error) {
    console.error("❌ Error in forgot-password:", error.message);
    res.status(500).json({ error: "Failed to generate OTP" });
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
