import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent the default form submission behavior
    console.log("Reset request initiated."); // Log when reset request is initiated
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter your registered email.",
        variant: "destructive",
      });
      console.log("No email entered."); // Log when no email is provided
      return;
    }

    setIsLoading(true);
    try {
      console.log(`Sending request to reset password for email: ${email}`); // Log email being sent
      const res = await fetch("http://localhost:5002/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      console.log("Reset link sent successfully."); // Log successful request
      toast({
        title: "Success",
        description: "Reset link sent. Check your email.",
      });

      navigate("/login"); // Redirect back to login after success
    } catch (error: any) {
      console.error("Error occurred while sending reset link:", error); // Log any error
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log("Reset request process completed."); // Log when the process is finished
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navbar */}
      <header className="bg-blue-600 text-white shadow-md">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
        <a href="/login" className="flex items-center">
          <img src="/newlogo.png" alt="Typo Detective Logo" className="h-10 filter brightness-0 invert" />
        </a>
        </div>
      </header>

      {/* Main Content (Centered Form) */}
      <main className="flex-grow flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white shadow-lg p-6 rounded-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-center mb-4">Reset Password</h2>
          <p className="text-center text-gray-600 mb-4">
            Enter your registered email to receive a reset link.
          </p>
          
          {/* Form element to handle reset password request */}
          <form onSubmit={handleResetRequest}>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mb-4"
            />
            <Button
              type="submit"  // Set the button to trigger form submission
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
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

      {/* Footer (Always at Bottom) */}
      <footer className="bg-[#2B2F3E] text-white py-6 text-center">
        <p>&copy; {new Date().getFullYear()} Connect Reseller. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default ResetPassword;
