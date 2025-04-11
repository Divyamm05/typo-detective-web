const express = require("express");
const crypto = require("crypto");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

// === Dummy Users Store ===
const dummyUsers = [
  {
    id: 1,
    email: "aichatbot@iwantdemo.com",
    password: "1234", // Will be replaced with hashed version
    reset_token: "demo-token-123",
    reset_token_expiry: Date.now() + 1000 * 60 * 10, // 10 mins from now
  },
];

// === Dummy Reset Password Route ===
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: "Missing token or password" });
  }

  // Find user with valid token
  const user = dummyUsers.find(
    (u) => u.reset_token === token && u.reset_token_expiry > Date.now()
  );

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  // Hash new password (you can still use bcrypt in real use)
  const hashedPassword = crypto.createHash("sha256").update(newPassword).digest("hex");

  // Update dummy user
  user.password = hashedPassword;
  user.reset_token = null;
  user.reset_token_expiry = null;

  console.log("Updated user:", user); // Optional debug

  return res.json({ message: "Password reset successful (dummy)" });
});

module.exports = router;
