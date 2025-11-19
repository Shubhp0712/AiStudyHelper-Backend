import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
    res.json({
        message: 'OTP routes are working!',
        timestamp: new Date().toISOString(),
        emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS)
    });
});

// In-memory store for OTPs (in production, use Redis or database)
const otpStore = new Map();

// Email configuration with enhanced spam prevention
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 10,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000
});

// Generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP endpoint
router.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const timestamp = Date.now();

        // Store OTP with 5-minute expiration
        otpStore.set(email, {
            otp,
            timestamp,
            attempts: 0
        });

        // Enhanced email template with better spam prevention
        const mailOptions = {
            from: `"AI Study Assistant" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Email Verification Code for AI Study Assistant',
            headers: {
                'X-Priority': '1',
                'X-MSMail-Priority': 'High',
                'Importance': 'high'
            },
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center; border: 1px solid #e9ecef;">
                        <div style="margin-bottom: 20px;">
                            <h1 style="color: #4f46e5; margin: 0; font-size: 28px;">AI Study Assistant</h1>
                            <p style="color: #6c757d; margin: 5px 0 0 0; font-size: 14px;">Secure Email Verification</p>
                        </div>
                        
                        <h2 style="color: #1f2937; margin: 20px 0;">Email Verification Required</h2>
                        <p style="color: #4b5563; font-size: 16px; margin: 15px 0;">
                            Thank you for registering with AI Study Assistant. Please use the verification code below to complete your account setup:
                        </p>
                        
                        <div style="background-color: white; padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #4f46e5; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <p style="color: #6c757d; margin: 0 0 10px 0; font-size: 14px;">Your verification code:</p>
                            <span style="font-size: 36px; font-weight: bold; color: #4f46e5; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</span>
                        </div>
                        
                        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
                            <p style="color: #856404; margin: 0; font-size: 14px;">
                                ⏰ This code will expire in <strong>5 minutes</strong><br>
                                🔒 Keep this code confidential and do not share it with anyone
                            </p>
                        </div>
                        
                        <div style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 30px;">
                            <p style="color: #6c757d; font-size: 12px; margin: 0;">
                                If you didn't request this verification, please ignore this email.<br>
                                This is an automated message from AI Study Assistant.
                            </p>
                        </div>
                    </div>
                </div>
            `,
            text: `Your OTP code for AI Study Assistant is: ${otp}. This code will expire in 5 minutes.`
        };

        // Send email with timeout
        console.log(`📤 Sending OTP email to ${email}...`);

        const emailPromise = transporter.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Email timeout after 30 seconds')), 30000)
        );

        await Promise.race([emailPromise, timeoutPromise]);

        console.log(`✅ OTP email sent successfully to ${email}`);

        res.json({
            success: true,
            message: 'OTP sent successfully'
        });

    } catch (error) {
        console.error('❌ Error sending OTP:', error.message);

        let errorMessage = 'Failed to send OTP';
        if (error.code === 'EAUTH') {
            errorMessage = 'Gmail authentication failed. You need a Gmail App Password, not your regular password.';
            console.error('🔑 Gmail App Password required. Visit: https://myaccount.google.com/apppasswords');
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Email service timeout. Please try again.';
            console.error('⏰ Email sending timed out after 10 seconds');
        }

        res.status(500).json({
            success: false,
            error: errorMessage
        });
    }
});

// Verify OTP endpoint
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        const storedData = otpStore.get(email);
        if (!storedData) {
            return res.status(400).json({
                success: false,
                error: 'OTP not found or expired'
            });
        }

        // Check if expired (5 minutes)
        const currentTime = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        if (currentTime - storedData.timestamp > fiveMinutes) {
            otpStore.delete(email);
            return res.status(400).json({
                success: false,
                error: 'OTP has expired'
            });
        }

        // Verify OTP
        if (storedData.otp !== otp) {
            return res.status(400).json({
                success: false,
                error: 'Invalid OTP'
            });
        }

        // OTP verified, remove from store
        otpStore.delete(email);

        res.json({
            success: true,
            message: 'OTP verified successfully'
        });

    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify OTP'
        });
    }
});

// Resend OTP endpoint
router.post('/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;

        // Generate new OTP
        const otp = generateOTP();
        const timestamp = Date.now();

        // Store new OTP
        otpStore.set(email, {
            otp,
            timestamp,
            attempts: 0
        });

        // Email template
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your New OTP Code - AI Study Assistant',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
                        <h1 style="color: #4f46e5;">AI Study Assistant</h1>
                        <h2 style="color: #1f2937;">New OTP Code</h2>
                        <p style="color: #4b5563; font-size: 16px;">
                            Your new OTP code is:
                        </p>
                        
                        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #4f46e5;">
                            <span style="font-size: 32px; font-weight: bold; color: #4f46e5; letter-spacing: 5px;">${otp}</span>
                        </div>
                        
                        <p style="color: #6b7280; font-size: 14px;">
                            This OTP will expire in <strong>5 minutes</strong>
                        </p>
                    </div>
                </div>
            `,
            text: `Your new OTP code for AI Study Assistant is: ${otp}. This code will expire in 5 minutes.`
        };

        // Send email
        await transporter.sendMail(mailOptions);

        res.json({
            success: true,
            message: 'New OTP sent successfully'
        });

    } catch (error) {
        console.error('Error resending OTP:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to resend OTP'
        });
    }
});

export default router;
