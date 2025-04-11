import express from "express";
import crypto from "crypto";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// In-memory mock user store (for dev/demo purposes)
const users = {
  "test@example.com": {}, // Add your test user(s) here
};

// POST /forgot-password
router.post("/forgot-password", async (req, res) => {
  console.log("[DEBUG] /forgot-password route hit");

  const { email } = req.body;
  console.log(`[REQUEST] Forgot password for: ${email}`);

  const user = users[email];
  if (!user) {
    console.warn(`[WARN] Email not found: ${email}`);
    return res.status(404).json({ message: "Email not registered" });
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

  users[email].resetToken = resetToken;
  users[email].resetTokenExpires = resetTokenExpires;

  const resetLink = `http://localhost:8080/new-password?token=${resetToken}`;
  console.log(`[TOKEN] Reset link: ${resetLink}`);

  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Reset Request",
    html: `
      <p>Hello,</p>
      <p>You requested to reset your password. Click below to reset it:</p>
      <p><a href="${resetLink}">Reset My Password</a></p>
      <p>This link will expire in 1 hour.</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Sent! ID: ${info.messageId}`);
    res.json({ message: "Reset link sent. Check your email." });
  } catch (emailError) {
    console.error("[EMAIL ERROR]", emailError);
    res.status(500).json({ message: "Failed to send reset email" });
  }
});

export default router;
