import express from "express";
import crypto from "crypto";
import mysql from "mysql2/promise";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// MySQL Connection
const db = await mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Divyam@05",
  database: "dnstwister",
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

    const resetLink = `http://localhost:8080/new-password?token=${resetToken}`;
    console.log(`[EMAIL] Reset link: ${resetLink}`);

    console.log("[EMAIL] Creating transporter...");
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: "divyam.hs@somaiya.edu",
        pass: "yhhv qwff zynz qjkr", // Use env variable in prod!
      },
      debug: true, // Enable debug mode for email logs
    });

    console.log("[EMAIL] Transporter created");

    const mailOptions = {
      from: "divyam.hs@somaiya.edu",
      to: email,
      subject: "Password Reset",
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
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
