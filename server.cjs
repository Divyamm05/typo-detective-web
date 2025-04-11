const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const admin = require("firebase-admin");

dotenv.config();

// Firebase Admin SDK Init
const path = require("path");
const serviceAccount = require(path.join(__dirname, "src", "routes", "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
const port = 5002;
app.use(cors());
app.use(bodyParser.json());

// MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) throw err;
  console.log("MySQL Connected");
});

// Signup - Firebase only
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRecord = await admin.auth().createUser({ email, password });
    const sql = "INSERT INTO users (email) VALUES (?)";
    db.query(sql, [email], (err, result) => {
      if (err) return res.status(500).send({ message: "DB Error" });
      res.status(201).send({ uid: userRecord.uid, email });
    });
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// Login - Firebase
app.post("/login", async (req, res) => {
  return res.status(400).send("Use Firebase Auth client SDK for login.");
});

// Verify Token (for protected routes)
app.post("/verify-token", async (req, res) => {
  const { idToken } = req.body;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    res.status(200).json({ uid: decoded.uid, email: decoded.email });
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
});

// Forgot Password (MySQL + Nodemailer)
app.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (results.length === 0) return res.status(404).json({ message: "Email not found" });

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 3600000);

    db.query(
      "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?",
      [token, expiry, email],
      async (err) => {
        if (err) return res.status(500).json({ message: "Failed to update token" });

        const resetLink = `${process.env.FRONTEND_URL}/new-password?token=${token}`;

        const transporter = nodemailer.createTransport({
          service: "gmail",
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
            <h2>Password Reset</h2>
            <p>Click the link below to reset your password:</p>
            <a href="${resetLink}">${resetLink}</a>
            <p>This link expires in 1 hour.</p>
          `,
        };

        try {
          await transporter.sendMail(mailOptions);
          res.status(200).json({ message: "Reset link sent." });
        } catch (emailErr) {
          console.error(emailErr);
          res.status(500).json({ message: "Failed to send email" });
        }
      }
    );
  });
});

// Reset Password (MySQL only)
app.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  db.query(
    "SELECT email FROM users WHERE reset_token = ? AND reset_token_expires > NOW()",
    [token],
    async (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (results.length === 0) return res.status(400).json({ message: "Invalid or expired token" });

      const email = results[0].email;
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      db.query(
        "UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE email = ?",
        [hashedPassword, email],
        (updateErr) => {
          if (updateErr) return res.status(500).json({ message: "Password update failed" });
          res.status(200).json({ message: "Password reset successful." });
        }
      );
    }
  );
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
