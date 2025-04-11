import express from "express";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
const dotenv = require('dotenv');
dotenv.config();

dotenv.config();
const router = express.Router();

// MySQL connection
const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

router.post("/update-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: "Missing token or password" });
  }

  try {
    // Find user with matching token and check if it's still valid
    const [rows] = await db.execute(
      "SELECT customer_id, reset_token_expires FROM customers WHERE reset_token = ?",
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const user = rows[0];
    const now = new Date();

    if (new Date(user.reset_token_expires) < now) {
      return res.status(400).json({ message: "Token has expired" });
    }

    // Update password (plain text) and clear token
    await db.execute(
      "UPDATE customers SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE customer_id = ?",
      [newPassword, user.customer_id]
    );

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error updating password:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
