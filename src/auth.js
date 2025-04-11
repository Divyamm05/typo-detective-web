import express from "express";
import bcrypt from "bcrypt";
import admin from "firebase-admin";
import { db } from "../firebase.js"; // your firebase setup file

const router = express.Router();

// POST /reset-password
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: "Missing token or password" });
  }

  try {
    // 🔍 Look up user by reset token
    const usersRef = db.collection("users");
    const snapshot = await usersRef
      .where("reset_token", "==", token)
      .where("reset_token_expiry", ">", new Date())
      .get();

    if (snapshot.empty) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const userDoc = snapshot.docs[0];
    const userRef = userDoc.ref;

    // 🔐 Hash the new password with bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // ✅ Update password and clear reset token info
    await userRef.update({
      password: hashedPassword,
      reset_token: admin.firestore.FieldValue.delete(),
      reset_token_expiry: admin.firestore.FieldValue.delete(),
    });

    return res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("[RESET ERROR]", error);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
