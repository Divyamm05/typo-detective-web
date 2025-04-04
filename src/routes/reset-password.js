import express from "express";


const router = express.Router();

// POST /reset-password
router.post("/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;
  
    try {
      const [rows] = await db.execute(
        "SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()",
        [token]
      );
  
      if (rows.length === 0) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
  
      const userId = rows[0].id;
      const hashedPassword = crypto.createHash("sha256").update(newPassword).digest("hex");
  
      await db.execute("UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?", [
        hashedPassword,
        userId,
      ]);
  
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
  

export default router;
