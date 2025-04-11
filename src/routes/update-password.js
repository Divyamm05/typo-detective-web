import express from "express";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import admin from "firebase-admin";
import { db } from "../firebase.js"; // Your Firebase setup file

dotenv.config();
const router = express.Router();

router.post("/update-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: "Missing token or password" });
  }

  try {
    // 🔍 Look up user with the given reset token
    const usersRef = db.collection("customers");
    const snapshot = await usersRef.where("reset_token", "==", token).get();

    if (snapshot.empty) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // ⏳ Check token expiration
    const now = new Date();
    if (userData.reset_token_expires.toDate() < now) {
      return res.status(400).json({ message: "Token has expired" });
    }

    // 🔐 Hash the new password using bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // ✅ Update password and clear token fields
    await userDoc.ref.update({
      password: hashedPassword,
      reset_token: admin.firestore.FieldValue.delete(),
      reset_token_expires: admin.firestore.FieldValue.delete(),
    });

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error updating password:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
