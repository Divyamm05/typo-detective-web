const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const app = express();
const port = 5002;

const resetTokens = new Map();

app.use(cors());
app.use(bodyParser.json());

// MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Divyam@05",
  database: "dnstwister",
});

// Connect to DB
db.connect((err) => {
  if (err) throw err;
  console.log("MySQL Connected");
});

// Signup route
app.post("/signup", (req, res) => {
  const { email, password } = req.body;
  const sql = "INSERT INTO users (email, password) VALUES (?, ?)";
  db.query(sql, [email, password], (err, result) => {
    if (err) return res.status(500).send(err);
    res.status(200).send({ id: result.insertId, email });
  });
});

// Login route
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM users WHERE email = ? AND password = ?";
  db.query(sql, [email, password], (err, results) => {
    if (err) return res.status(500).send(err);
    if (results.length === 0) {
      return res.status(401).send("Invalid credentials");
    }
    res.status(200).send({ id: results[0].customer_id, email });
  });
});

app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  console.log(`[REQUEST] Forgot password for: ${email}`);

  try {
    db.query("SELECT customer_id FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) {
        console.error(`[DB] Error during user lookup:`, err);
        return res.status(500).json({ message: "Database error" });
      }

      console.log(`[DB] User lookup result:`, results);
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

          console.log(`[DB] Token successfully stored for ${email}`);

          const resetLink = `http://localhost:8080/new-password?token=${resetToken}`;

          console.log(`[EMAIL] Reset link: ${resetLink}`);

          const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
              user: "divyam.hs@somaiya.edu",
              pass: "yhhv qwff zynz qjkr",
            },
          });

          const mailOptions = {
            from: "divyam.hs@somaiya.edu",
            to: email,
            subject: "Password Reset",
            html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
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
app.post("/reset-password", (req, res) => {
  const { token, newPassword } = req.body;

  // Check token in DB
  db.query(
    "SELECT email FROM users WHERE reset_token = ? AND reset_token_expires > NOW()",
    [token],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });

      if (results.length === 0) {
        return res.status(400).json({ message: "Invalid or expired token." });
      }

      const email = results[0].email;

      // Update password and clear token
      db.query(
        "UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE email = ?",
        [newPassword, email],
        (updateErr) => {
          if (updateErr) return res.status(500).json({ message: "Error updating password" });

          res.status(200).json({ message: "Password reset successful." });
        }
      );
    }
  );
});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
