import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext"; 
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (email: string, password: string) => {
    const res = await fetch("http://localhost:5002/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) throw new Error("Login failed");

    const user = await res.json();
    localStorage.setItem("user", JSON.stringify(user));
  };

  const handleSignup = async (email: string, password: string) => {
    if (email === "aichatbot@iwantdemo.com" && password === "1234") {
      const testUser = { email, token: "fake-token-for-testing" };
      localStorage.setItem("user", JSON.stringify(testUser));
      return;
    }

    const res = await fetch("http://localhost:5002/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) throw new Error("Signup failed");

    const user = await res.json();
    localStorage.setItem("user", JSON.stringify(user));
  };

  const { login } = useAuth();  // Get login function from AuthContext
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
  
    try {
      if (isLogin) {
        await handleLogin(email, password);
        const user = JSON.parse(localStorage.getItem("user") || "{}"); 
        
        toast({
          title: "Login successful",
          description: "Welcome back!",
        });
    
        if (user && user.email) {
          await login(user.email, password);
        }
    
        navigate("/dashboard"); // Redirect to dashboard after login
      } else {
        await handleSignup(email, password);
        toast({
          title: "Signup successful",
          description: "Your account has been created. Please log in.",
        });
        console.log("Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
          window.location.reload();
        });
      }
    } catch (error: any) {
      toast({
        title: isLogin ? "Login failed" : "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address first.",
        variant: "destructive",
      });
      return;
    }
  
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
  
      if (!res.ok) throw new Error("Failed to send reset email");
  
      toast({
        title: "Reset Link Sent",
        description: "Check your email for instructions.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="bg-blue-600 text-white shadow-md">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
        <a href="/login" className="flex items-center">
          <img src="/newlogo.png" alt="Connect Reseller logo" className="h-10 filter brightness-0 invert" />
        </a>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 bg-white">
        <div className="w-full max-w-md">
          <Card className="shadow-lg border border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">
                {isLogin ? "Login" : "Create an Account"}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {isLogin
                  ? "Enter your credentials to access your account"
                  : "Fill in the information below to create your account"}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      {isLogin ? "Logging in..." : "Signing up..."}
                    </span>
                  ) : isLogin ? (
                    "Login"
                  ) : (
                    "Sign Up"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-blue-600 hover:underline"
                  onClick={() => setIsLogin(!isLogin)}
                >
                  {isLogin
                    ? "Need an account? Sign Up"
                    : "Already have an account? Login"}
                </Button>
                <Button
                  variant="ghost"
                  className="text-blue-600 hover:underline"
                  onClick={() => navigate("/reset-password")} // Navigate instead of sending email directly
                  >
                  Forgot Password?
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </main>

      <footer className="bg-[#2B2F3E] text-white py-8">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p>
              &copy; {new Date().getFullYear()} Connect Reseller. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Login;
