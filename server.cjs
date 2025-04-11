const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = 5002;

app.use(cors());
app.use(bodyParser.json());

// In-memory "database"
const users = []; // Array of { email, password, reset_token, reset_token_expires }
const resetTokens = new Map();

// Signup
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  const userExists = users.some((user) => user.email === email);
  if (userExists) return res.status(400).json({ message: "Email already registered" });

  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ email, password: hashedPassword });

  res.status(200).json({ email });
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

  res.status(200).json({ email });
});

// Forgot password
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = users.find((u) => u.email === email);

  if (!user) return res.status(404).json({ message: "Email not found" });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 3600000); // 1 hour

  user.reset_token = token;
  user.reset_token_expires = expires;

  const resetLink = `http://localhost:8080/new-password?token=${token}`;

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
    html: `<p>Click <a href="${resetLink}">here</a> to reset your password. Link expires in 1 hour.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: "Reset link sent. Check your email." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send email" });
  }
});

// Reset password
app.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  const user = users.find((u) => u.reset_token === token && new Date(u.reset_token_expires) > new Date());
  if (!user) return res.status(400).json({ message: "Invalid or expired token" });

  user.password = await bcrypt.hash(newPassword, 10);
  user.reset_token = null;
  user.reset_token_expires = null;

  res.status(200).json({ message: "Password reset successful" });
});

// Update password (same as reset-password logic in this case)
app.post("/update-password", async (req, res) => {
  const { token, newPassword } = req.body;

  const user = users.find((u) => u.reset_token === token && new Date(u.reset_token_expires) > new Date());
  if (!user) return res.status(400).json({ message: "Invalid or expired token" });

  user.password = await bcrypt.hash(newPassword, 10);
  user.reset_token = null;
  user.reset_token_expires = null;

  res.status(200).json({ message: "Password updated successfully." });
});

app.listen(port, () => {
  console.log(`Mock server running at http://localhost:${port}`);
});
