import express from "express";
import crypto from "crypto";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import admin from "firebase-admin";
import serviceAccount from "./serviceAccountKey.json";

dotenv.config();

const router = express.Router();

// Firebase Admin SDK init
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
console.log("[INIT] Connected to Firebase Firestore");

// POST /forgot-password
router.post("/forgot-password", async (req, res) => {
  console.log("[DEBUG] /forgot-password route hit");

  const { email } = req.body;
  console.log(`[REQUEST] Forgot password for: ${email}`);

  try {
    // Firestore: Look up user by email
    const userQuery = await db.collection("users").where("email", "==", email).get();

    if (userQuery.empty) {
      console.warn(`[WARN] Email not found: ${email}`);
      return res.status(404).json({ message: "Email not registered" });
    }

    const userDoc = userQuery.docs[0];
    const userId = userDoc.id;

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    console.log(`[TOKEN] Generated token: ${resetToken}`);
    console.log(`[TOKEN] Expires at: ${resetTokenExpires}`);

    // Update Firestore with token & expiry
    await db.collection("users").doc(userId).update({
      reset_token: resetToken,
      reset_token_expires: resetTokenExpires.toISOString(),
    });

    const resetLink = `${process.env.REACT_APP_BACKEND_URL}/new-password?token=${resetToken}`;
    console.log(`[EMAIL] Reset link: ${resetLink}`);

    // Email setup
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      debug: true,
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      html: `
        <html>
          <body>
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
              <h2>Password Reset Request</h2>
              <p>Hello,</p>
              <p>We received a request to reset the password for your account associated with <strong>${email}</strong>.</p>
              <p>If you didn't request a password reset, please ignore this email. If you'd like to proceed with the password reset, please click the link below:</p>
              <p style="text-align: center;">
                <a href="${resetLink}" style="background-color: #007BFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset My Password</a>
              </p>
              <p>This link will expire in 1 hour.</p>
              <br />
              <p>Best regards,</p>
              <p>The Support Team</p>
              <footer style="font-size: 0.9em; color: #777;">
                <p>Note: This is an automated message. Please do not reply directly to this email.</p>
              </footer>
            </div>
          </body>
        </html>
      `,
    };

    console.log("[EMAIL] Sending email...");
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Email sent successfully! ID: ${info.messageId}`);

    res.json({ message: "Reset link sent. Check your email." });
  } catch (error) {
    console.error(`[ERROR] Unhandled server error:`, error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
