import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

type DomainResult = {
  permutation: string;
  permutationType: string;
  ip: string;
  ipv6: string;
  country: string;
  nameServer: string;
  mailServer: string;
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [domain, setDomain] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<DomainResult[]>([]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const analyzeDomain = async () => {
    if (!domain.trim()) {
      toast({ title: "Error", description: "Please enter a domain", variant: "destructive" });
      return;
    }

    const cleanDomain = domain.trim().toLowerCase();
    const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(cleanDomain)) {
      toast({ title: "Invalid domain", description: "Please enter a valid domain", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    setResults([]);
    toast({ title: "Fetching DNS data...", description: `Querying ${cleanDomain}` });

    try {
      const response = await fetch(`http://127.0.0.1:5001/dns_lookup?domain=${encodeURIComponent(cleanDomain)}`);
      if (!response.ok) throw new Error(`Server Error: ${response.statusText}`);

      const data: DomainResult[] = await response.json();
      setResults(data);
      toast({ title: "Analysis complete", description: `Fetched DNS data for ${cleanDomain}` });

    } catch (error) {
      setResults([]);
      toast({ title: "Error", description: `Failed to fetch DNS data: ${error.message}`, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="bg-blue-600 text-white shadow-md">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <img src="/newlogo.png" alt="Typo Detective Logo" className="h-10 filter brightness-0 invert"/>

          {/* Centered Heading */}
          <h1 className="text-lg font-semibold flex-grow text-center">
            Phishing Domain Scanner
          </h1>

          {/* User Info + Logout */}
          <div className="flex items-center gap-4">
            <span>Hello, {user?.email}</span>
            <Button className="bg-white text-black hover:bg-gray-300 transition-colors" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

  
      {/* Make main content flexible to push the footer down */}
      <main className="container mx-auto py-8 px-4 flex-grow">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Domain Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <form 
              onSubmit={(e) => {
                e.preventDefault(); // Prevents page reload
                analyzeDomain();
              }}
              className="flex gap-4"
            >
              <Input 
                type="text" 
                placeholder="Enter domain (e.g., example.com)" 
                value={domain} 
                onChange={(e) => setDomain(e.target.value)} 
                disabled={isAnalyzing} 
              />
              <Button 
                type="submit" 
                disabled={isAnalyzing} 
                className="bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isAnalyzing ? "Analyzing..." : "Analyze Domain"}
              </Button>
            </form>
          </CardContent>
        </Card>
  
        {results.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permutation</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Name Server</TableHead>
                <TableHead>Mail Server</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="font-semibold">{result.permutation}</div>
                    <div className="text-xs text-gray-500">{result.permutationType}</div>
                  </TableCell>
                  <TableCell>
                    <div>{result.ip}</div>
                    <div>{result.ipv6}</div>  
                    <div className="text-xs text-gray-500">{result.country}</div>
                  </TableCell>
                  <TableCell>{result.nameServer}</TableCell>
                  <TableCell>{result.mailServer}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </main>
  
      {/* Sticky Footer */}
      <footer className="bg-[#2B2F3E] text-white py-8 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p>
            &copy; {new Date().getFullYear()} Connect Reseller. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
  
};

export default Dashboard;