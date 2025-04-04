import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "../context/AuthContext";

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navbar */}
      <header className="bg-blue-600 text-white shadow-md">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
        <img src="/newlogo.png" alt="Typo Detective Logo" className="h-10 filter brightness-0 invert"/>
          <Button
            className="bg-white text-blue-600 hover:bg-gray-100"
            onClick={() => navigate(user ? "/login" : "/login")}
          >
            {user ? "Login / Sign Up" : "Login / Sign Up"}
          </Button>
        </div>
      </header>

      {/* Main Section */}
      <main className="flex-grow bg-white text-center flex items-center justify-center px-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
            Detect Domain Typosquatting Before It Happens
          </h1>
          <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto text-gray-700">
            Protect your brand from typosquatting attacks by identifying potential phishing domains
          </p>
          <Button
            size="lg"
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => navigate(user ? "/login" : "/login")}
          >
            {user ? "Get Started" : "Get Started"}
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#2B2F3E] text-white py-8">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p>&copy; {new Date().getFullYear()} Connect Reseller. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
