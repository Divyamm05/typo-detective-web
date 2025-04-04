
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "../context/AuthContext";

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Typo Detective</h1>
          <Button onClick={() => navigate(user ? "/dashboard" : "/login")}>
            {user ? "Dashboard" : "Login / Sign Up"}
          </Button>
        </div>
      </header>

      <main>
        <section className="py-20 bg-gradient-to-b from-brand-700 to-brand-800 text-white">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Detect Domain Typosquatting Before It Happens</h1>
            <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto">
              Protect your brand from typosquatting attacks by identifying potential phishing domains
            </p>
            <Button 
              size="lg" 
              className="bg-white text-brand-800 hover:bg-gray-100"
              onClick={() => navigate(user ? "/dashboard" : "/login")}
            >
              {user ? "Go to Dashboard" : "Get Started"}
            </Button>
          </div>
        </section>

        <section className="py-16 bg-muted">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-background p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold mb-4">1</div>
                <h3 className="text-xl font-semibold mb-2">Enter Your Domain</h3>
                <p className="text-muted-foreground">Simply input your domain name into our secure analysis tool.</p>
              </div>
              <div className="bg-background p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold mb-4">2</div>
                <h3 className="text-xl font-semibold mb-2">Generate Variations</h3>
                <p className="text-muted-foreground">Our system generates hundreds of potential typosquatting variations.</p>
              </div>
              <div className="bg-background p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold mb-4">3</div>
                <h3 className="text-xl font-semibold mb-2">Identify Threats</h3>
                <p className="text-muted-foreground">Discover active typosquatting domains that could be used in phishing attacks.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Protect Your Brand?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Don't wait until it's too late. Start identifying potential typosquatting threats today.
            </p>
            <Button 
              size="lg"
              onClick={() => navigate(user ? "/dashboard" : "/login")}
              className="bg-primary text-primary-foreground"
            >
              {user ? "Go to Dashboard" : "Get Started"}
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p>&copy; {new Date().getFullYear()} Typo Detective. All rights reserved.</p>
            <p className="text-gray-400 text-sm mt-2">
              This is a demo application for educational purposes only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
