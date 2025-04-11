import express from "express";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import admin from "firebase-admin";
import serviceAccount from "./serviceAccountKey.json"; 

dotenv.config();

const router = express.Router();

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
console.log("[INIT] Firebase Firestore connected");

// POST /reset-password
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: "Token and new password are required." });
  }

  try {
    // Find user with the matching reset token
    const userSnapshot = await db.collection("users").where("reset_token", "==", token).get();

    if (userSnapshot.empty) {
      return res.status(404).json({ message: "Invalid or expired token." });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    const tokenExpiry = new Date(userData.reset_token_expires);
    if (tokenExpiry < new Date()) {
      return res.status(400).json({ message: "Token has expired." });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear the token
    await db.collection("users").doc(userDoc.id).update({
      password: hashedPassword,
      reset_token: admin.firestore.FieldValue.delete(),
      reset_token_expires: admin.firestore.FieldValue.delete(),
    });

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("[ERROR] Reset password failed:", error);
    return res.status(500).json({ message: "Server error." });
  }
});

export default router;
