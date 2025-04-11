import express from "express";
import crypto from "crypto";
import mysql from "mysql2/promise";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
const dotenv = require('dotenv');
dotenv.config();

dotenv.config();
const router = express.Router();

// MySQL Connection
const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

console.log("[INIT] Connected to MySQL");

// POST /forgot-password
router.post("/forgot-password", async (req, res) => {
  console.log("[DEBUG] /forgot-password route hit");

  const { email } = req.body;
  console.log(`[REQUEST] Forgot password for: ${email}`);

  try {
    const [rows] = await db.execute("SELECT customer_id FROM users WHERE email = ?", [email]);
    console.log(`[DB] User lookup result:`, rows);

    if (rows.length === 0) {
      console.warn(`[WARN] Email not found: ${email}`);
      return res.status(404).json({ message: "Email not registered" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour
    console.log(`[TOKEN] Generated token: ${resetToken}`);
    console.log(`[TOKEN] Expires at: ${resetTokenExpires}`);

    const [updateResult] = await db.execute(
      "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?",
      [resetToken, resetTokenExpires, email]
    );

    console.log("[DB] Update result:", updateResult);

    if (updateResult.affectedRows === 0) {
      console.error(`[DB] Update failed: No rows affected for ${email}`);
    } else {
      console.log(`[DB] Token successfully stored for ${email}`);
    }

    const resetLink = `${process.env.REACT_APP_BACKEND_URL}/new-password?token=${resetToken}`;
    console.log(`[EMAIL] Reset link: ${resetLink}`);

    console.log("[EMAIL] Creating transporter...");
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, 
      },
      debug: true, 
    });

    console.log("[EMAIL] Transporter created");

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
              <p>If you have any questions or concerns, feel free to contact our support team.</p>
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
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[EMAIL] Email sent successfully! ID: ${info.messageId}`);
    } catch (emailError) {
      console.error("[EMAIL ERROR] Failed to send email:", emailError);
      return res.status(500).json({ message: "Failed to send reset email" });
    }

    res.json({ message: "Reset link sent. Check your email." });
  } catch (error) {
    console.error(`[ERROR] Unhandled server error:`, error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
