const express = require("express");
const bcrypt = require("bcrypt");
const mysql = require("mysql");
const router = express.Router();

// Set up MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root", // Your MySQL user
  password: "", // Your MySQL password
  database: "your_database_name",
});

router.post("/reset-password", (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: "Token and new password are required." });
  }

  // Fetch the user using the reset token
  const query = `SELECT * FROM users WHERE reset_token = ?`;
  db.query(query, [token], async (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error." });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Invalid or expired token." });
    }

    const user = results[0];

    // Check if the token has expired
    const tokenExpiry = new Date(user.reset_token_expires);
    if (tokenExpiry < new Date()) {
      return res.status(400).json({ message: "Token has expired." });
    }

    // Hash the new password
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the password in the database
      const updateQuery = `
        UPDATE users 
        SET password = ?, reset_token = NULL, reset_token_expires = NULL 
        WHERE customer_id = ?`;

      db.query(updateQuery, [hashedPassword, user.customer_id], (err, result) => {
        if (err) {
          return res.status(500).json({ message: "Failed to update password." });
        }

        return res.status(200).json({ message: "Password updated successfully." });
      });
    } catch (error) {
      return res.status(500).json({ message: "Error hashing password." });
    }
  });
});

module.exports = router;
