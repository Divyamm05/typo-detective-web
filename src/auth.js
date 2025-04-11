const express = require("express");
const mysql = require("mysql2/promise");
const crypto = require("crypto");
const sendResetEmail = require("../mailer"); 
const dotenv = require('dotenv');
dotenv.config();

const router = express.Router();

// MySQL Connection
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// Forgot Password Endpoint
router.post("/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;
  
    try {
      // Validate token
      const [users] = await db.query(
        "SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()",
        [token]
      );
  
      if (users.length === 0) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
  
      // Hash new password (use bcrypt)
      const hashedPassword = crypto.createHash("sha256").update(newPassword).digest("hex");
  
      // Update password in DB
      await db.query("UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE reset_token = ?", 
        [hashedPassword, token]);
  
      res.json({ message: "Password reset successful" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });

module.exports = router;
