import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Extract token from URL on mount for reset password flow
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromURL = params.get("reset_token");
    if (tokenFromURL) {
      setToken(tokenFromURL);
      console.log("Reset token found in URL:", tokenFromURL);
    }
  }, []);

  // === FORGOT PASSWORD FLOW ===
  const handleResetRequest = async () => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter your registered email.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:5002/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast({
        title: "Success",
        description: "Reset link sent. Check your email.",
      });

      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // === RESET PASSWORD FLOW ===
  const handleResetPassword = async () => {
    if (!password.trim() || !confirmPassword.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both password fields.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:5002/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast({
        title: "Success",
        description: "Your password has been reset. You can now log in.",
      });

      navigate("/login"); // Redirect user to login page
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If no token, show error message and don't render reset password form
  if (!token && !email) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <header className="bg-blue-600 text-white shadow-md">
          <div className="container mx-auto py-4 px-4 flex justify-between items-center">
            <img src="/newlogo.png" alt="Typo Detective Logo" className="h-10 filter brightness-0 invert" />
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-white shadow-lg p-6 rounded-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-center mb-4">Reset Password</h2>
            <p className="text-center text-gray-600 mb-4">
              Enter your registered email to receive a reset link.
            </p>

            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleResetRequest}
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </Button>
            <Button
              variant="ghost"
              className="w-full mt-2 text-blue-600 hover:underline"
              onClick={() => navigate("/login")}
            >
              Back to Login
            </Button>
          </div>
        </main>

        <footer className="bg-[#2B2F3E] text-white py-6 text-center">
          <p>&copy; {new Date().getFullYear()} Connect Reseller. All rights reserved.</p>
        </footer>
      </div>
    );
  }

  // Password reset flow
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="bg-blue-600 text-white shadow-md">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <img src="/newlogo.png" alt="Typo Detective Logo" className="h-10 filter brightness-0 invert" />
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white shadow-lg p-6 rounded-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-center mb-4">
            Set New Password
          </h2>
          <p className="text-center text-gray-600 mb-4">
            Enter a new password for your account.
          </p>
          <Input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mb-4"
          />
          <Input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="mb-4"
          />
          <Button
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleResetPassword}
            disabled={isLoading}
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </Button>
        </div>
      </main>

      <footer className="bg-[#2B2F3E] text-white py-6 text-center mt-auto">
        <p>&copy; {new Date().getFullYear()} Connect Reseller. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default ResetPassword;
