import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress"; 
import { Download, Share } from "lucide-react";

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
  const [processedCount, setProcessedCount] = useState(0);
  const [totalPermutations, setTotalPermutations] = useState(0);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const downloadAsCSV = () => {
    const headers = ["permutation", "permutationType", "ip", "ipv6", "country", "nameServer", "mailServer"];
    const csv = [
      headers.join(","),
      ...results.map(r =>
        [r.permutation, r.permutationType, r.ip, r.ipv6, r.country, r.nameServer, r.mailServer].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${domain}_scan_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsJSON = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${domain}_scan_results.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const analyzeDomain = async () => {
    if (!domain.trim()) {
      toast({
        title: "Error",
        description: "Please enter a domain",
        variant: "destructive",
      });
      return;
    }
  
    const cleanDomain = domain.trim().toLowerCase();
    const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(cleanDomain)) {
      toast({
        title: "Invalid domain",
        description: "Please enter a valid domain",
        variant: "destructive",
      });
      return;
    }
  
    setIsAnalyzing(true);
    setResults([]);
    setProcessedCount(0);
    setTotalPermutations(0);
    toast({
      title: "Fetching DNS data...",
      description: `Querying ${cleanDomain}`,
    });
  
    try {
      const response = await fetch(`http://127.0.0.1:5001/stream_dns_lookup?domain=${encodeURIComponent(cleanDomain)}`);
  
      if (!response.body) {
        throw new Error("No response body from server");
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
  
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
  
        buffer += decoder.decode(value, { stream: true });
  
        const parts = buffer.split("\n\n");
        for (let i = 0; i < parts.length - 1; i++) {
          const line = parts[i].trim();
          if (line.startsWith("data:")) {
            const jsonStr = line.replace("data:", "").trim();
            try {
              const result: DomainResult = JSON.parse(jsonStr);
              setResults(prev => [...prev, result]);
              setProcessedCount(prev => prev + 1);
            } catch (err) {
              console.warn("Invalid JSON chunk:", jsonStr);
            }
          } else if (line.startsWith("meta:")) {
            const meta = JSON.parse(line.replace("meta:", "").trim());
            if (meta.total) setTotalPermutations(meta.total);
          }
        }

        buffer = parts[parts.length - 1];
      }

      toast({
        title: "Analysis complete",
        description: `Fetched DNS data for ${cleanDomain}`,
      });
  
    } catch (error: any) {
      setResults([]);
      toast({
        title: "Error",
        description: `Failed to fetch DNS data: ${error.message}`,
        variant: "destructive",
      });
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
        className="flex flex-col sm:flex-row gap-4"
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

      {isAnalyzing && (
        <div className="mt-4">
          <p className="text-sm mb-2 text-gray-500">
            Processed {processedCount} {totalPermutations ? `of ${totalPermutations}` : ""}
          </p>
          <Progress value={totalPermutations ? (processedCount / totalPermutations) * 100 : undefined} />
        </div>
      )}
      {!isAnalyzing && results.length > 0 && (
              <p className="text-sm text-gray-600 mt-4">
                Scanned {totalPermutations} permutations.
              </p>
            )}
    </CardContent>
  </Card>

  {results.length > 0 && (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold"></h2>
        <div className="flex gap-2">
          <Button onClick={downloadAsCSV} variant="outline">
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button onClick={downloadAsJSON} variant="outline">
            <Download className="w-4 h-4 mr-1" /> JSON
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
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
                  <div className="font-semibold">
                    <a
                      href={`http://${result.permutation}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {result.permutation}
                    </a>
                  </div>
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
      </div>
    </>
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