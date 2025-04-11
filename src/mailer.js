const nodemailer = require("nodemailer");
const dotenv = require('dotenv');
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASSWORD, // Your email app password
  },
});

async function sendResetEmail(email, token) {
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;

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
              <p>If you have any questions or concerns, feel free to contact our support team.</p>
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
    await transporter.sendMail(mailOptions);
    console.log("Password reset email sent successfully.");
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

module.exports = sendResetEmail;
