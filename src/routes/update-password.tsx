import express from "express";

const router = express.Router();

// Dummy user data
let dummyUser = {
  email: "aichatbot@iwantdemo.com",
  password: "1234",
  reset_token: "dummytoken123",
  reset_token_expires: new Date(Date.now() + 15 * 60 * 1000), // expires in 15 minutes
};

// Update password route without MySQL
router.post("/update-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: "Missing token or password" });
  }

  try {
    // Check token validity
    if (
      dummyUser.reset_token !== token ||
      new Date(dummyUser.reset_token_expires) < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Update password and clear token
    dummyUser.password = newPassword;
    dummyUser.reset_token = null;
    dummyUser.reset_token_expires = null;

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error updating password:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
