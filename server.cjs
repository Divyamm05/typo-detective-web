const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const dotenv = require('dotenv');
dotenv.config();


const app = express();
const port = 5002;

const resetTokens = new Map();

app.use(cors());
app.use(bodyParser.json());

// MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// Connect to DB
db.connect((err) => {
  if (err) throw err;
  console.log("MySQL Connected");
});

const bcrypt = require("bcrypt");

// Signup route
app.post("/signup", (req, res) => {
  const { email, password } = req.body;

  // Hash the password
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      return res.status(500).send({ message: "Error hashing password" });
    }

    const sql = "INSERT INTO users (email, password) VALUES (?, ?)";
    db.query(sql, [email, hashedPassword], (err, result) => {
      if (err) return res.status(500).send({ message: "Database error" });
      res.status(200).send({ id: result.insertId, email });
    });
  });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Query to find the user by email
  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).send(err);

    // If no user is found
    if (results.length === 0) {
      return res.status(401).send("Invalid credentials");
    }

    // Get the user's hashed password from the database
    const hashedPassword = results[0].password;

    // Compare the provided password with the hashed password
    bcrypt.compare(password, hashedPassword, (err, isMatch) => {
      if (err) return res.status(500).send("Error comparing passwords");

      // If the passwords match, return a success response
      if (isMatch) {
        return res.status(200).send({ id: results[0].customer_id, email });
      } else {
        return res.status(401).send("Invalid credentials");
      }
    });
  });
});

// Forgot password route
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  console.log(`[REQUEST] Forgot password for: ${email}`);

  try {
    db.query("SELECT customer_id FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) {
        console.error(`[DB] Error during user lookup:`, err);
        return res.status(500).json({ message: "Database error" });
      }

      if (results.length === 0) {
        console.warn(`[WARN] Email not found: ${email}`);
        return res.status(404).json({ message: "Email not registered" });
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour
      console.log(`[TOKEN] Generated token: ${resetToken}`);
      console.log(`[TOKEN] Expires at: ${resetTokenExpires}`);

      db.query(
        "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?",
        [resetToken, resetTokenExpires, email],
        async (updateErr, updateResult) => {
          if (updateErr) {
            console.error(`[DB] Failed to update reset token:`, updateErr);
            return res.status(500).json({ message: "Database update error" });
          }

          const resetLink = `${process.env.REACT_APP_BACKEND_URL}/new-password?token=${resetToken}`;
          console.log(`[EMAIL] Reset link: ${resetLink}`);

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

          try {
            const info = await transporter.sendMail(mailOptions);
            console.log(`[EMAIL] Email sent: ${info.messageId}`);
            res.json({ message: "Reset link sent. Check your email." });
          } catch (mailErr) {
            console.error(`[EMAIL] Failed to send email:`, mailErr);
            res.status(500).json({ message: "Failed to send email" });
          }
        }
      );
    });
  } catch (error) {
    console.error(`[ERROR] Unexpected:`, error);
    res.status(500).json({ message: "Server error" });
  }
});

// Reset Password Route
app.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  // Check token in DB
  db.query(
    "SELECT email FROM users WHERE reset_token = ? AND reset_token_expires > NOW()",
    [token],
    async (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });

      if (results.length === 0) {
        return res.status(400).json({ message: "Invalid or expired token." });
      }

      const email = results[0].email;

      // Hash the new password before storing it
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and clear token
      db.query(
        "UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE email = ?",
        [hashedPassword, email],
        (updateErr) => {
          if (updateErr) return res.status(500).json({ message: "Error updating password" });

          res.status(200).json({ message: "Password reset successful." });
        }
      );
    }
  );
});

// Update Password Route
app.post("/update-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: "Missing token or password" });
  }

  // Check token in DB and validate if it's still within the expiration time
  db.query(
    "SELECT email FROM users WHERE reset_token = ? AND reset_token_expires > NOW()",
    [token],
    async (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });

      if (results.length === 0) {
        return res.status(400).json({ message: "Invalid or expired token." });
      }

      const email = results[0].email;

      // Hash the new password before storing it
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the password and clear the reset token
      db.query(
        "UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE email = ?",
        [hashedPassword, email],
        (updateErr) => {
          if (updateErr) return res.status(500).json({ message: "Error updating password" });

          res.status(200).json({ message: "Password updated successfully." });
        }
      );
    }
  );
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
