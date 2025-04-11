import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const NewPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { toast } = useToast();

  // Show error toast once if token is missing
  useEffect(() => {
    if (!token) {
      toast({
        title: "Invalid Request",
        description: "Password reset token is missing.",
        variant: "destructive",
      });
    }
  }, [token, toast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) return; // prevent unnecessary fetch if token is missing

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
      const res = await fetch("http://localhost:5002/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");

      toast({
        title: "Success",
        description: "Your password has been reset. You can now log in.",
      });
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) return null; // avoid rendering form if token is missing

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navbar */}
      <header className="bg-blue-600 text-white shadow-md">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <a href="/login" className="flex items-center">
            <img
              src="/newlogo.png"
              alt="Connect Reseller logo"
              className="h-10 filter brightness-0 invert"
            />
          </a>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-grow flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white shadow-lg p-6 rounded-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-center mb-4">Set New Password</h2>
          <p className="text-center text-gray-600 mb-6">
            Enter a new password for your account.
          </p>
          <form onSubmit={handleResetPassword}>
            <Input
              type="password"
              placeholder="New Password"
              aria-label="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mb-4"
            />
            <Input
              type="password"
              placeholder="Confirm Password"
              aria-label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="mb-4"
            />
            <Button
              type="submit"
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>

          <Button
            variant="ghost"
            className="w-full mt-2 text-blue-600 hover:underline"
            onClick={() => navigate("/login")}
          >
            Back to Login
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#2B2F3E] text-white py-6 text-center mt-auto">
        <p>&copy; {new Date().getFullYear()} Connect Reseller. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default NewPassword;
