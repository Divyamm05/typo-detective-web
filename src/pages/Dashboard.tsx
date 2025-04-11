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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useRef } from "react";


type DomainResult = {
  permutation: string;
  permutationType: string;
  ip: string;
  ipv6: string;
  country: string;
  nameServer: string;
  mailServer: string;
  error?: string;
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [domain, setDomain] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<DomainResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(true); // or from props
  const [processedCount, setProcessedCount] = useState(0);
  const [attemptedCount, setAttemptedCount] = useState(0);
  const [totalPermutations, setTotalPermutations] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all", "registered", "error", or any permutationType
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);

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

  const getPermutationExplanation = (type: string) => {
    const explanations: Record<string, string> = {
      Omission: "A character is removed from the domain (e.g. exmple.com).",
      Replacement: "A character is replaced with a nearby key (e.g. ezample.com).",
      Insertion: "An extra character is inserted (e.g. exaample.com).",
      Repetition: "A character is repeated (e.g. exaample.com).",
      "Double-Repetition": "Two or more characters are repeatedly typed (e.g. exaaample.com).",
      Transposition: "Two characters are swapped (e.g. examlpe.com).",
      Homoglyph: "A character is replaced with a similar-looking one (e.g. examp1e.com).",
      Bitsquatting: "A domain with a single bit error in a character (e.g. ezample.com).",
      "TLD-Swap": "The top-level domain is changed (e.g. example.net instead of .com).",
      Subdomain: "A subdomain is added (e.g. mail.example.com).",
      "Keyboard-Proximity": "A typo based on keyboard layout (e.g. exanple.com).",
      "Double-Swap": "Two adjacent characters are swapped and repeated (e.g. examlpe.com).",
      Shuffle: "Characters in the domain are randomly shuffled.",
      Dictionary: "A known phishing word is added to the domain.",
      "Vowel-Swap": "A vowel is swapped with another vowel (e.g. exemple.com).",
      Addition: "An extra word or token is added to the domain (e.g. login-example.com).",
      Hyphenation: "A hyphen is added or removed (e.g. ex-ample.com).",
      Original: "The original domain name (no mutation).",
    };
  
    return explanations[type] || "A variation of the domain.";
  };
  
  const LoadingRow = () => (
    <tr>
      <td><Skeleton className="h-4 w-[150px]" /></td>
      <td><Skeleton className="h-4 w-[100px]" /></td>
      <td><Skeleton className="h-4 w-[120px]" /></td>
    </tr>
  );

  const analyzeDomain = async () => {
    if (isAnalyzing) {
      // If already analyzing, stop the stream
      readerRef.current?.cancel();
      setIsAnalyzing(false);
      toast({
        title: "Analysis stopped",
        description: "You stopped the domain analysis.",
      });
      return;
    }
  
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
    setAttemptedCount(0);
    setTotalPermutations(0);
  
    toast({
      title: "Fetching DNS data...",
      description: `Querying ${cleanDomain}`,
    });
  
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/stream_dns_lookup?domain=${encodeURIComponent(cleanDomain)}`);
  
      if (!response.body) throw new Error("No response body from server");
  
      const reader = response.body.getReader();
      readerRef.current = reader;
  
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
              if (result.permutation) {
                setResults(prev => [...prev, result]);
              }
              setProcessedCount(prev => prev + 1);
              setAttemptedCount(prev => prev + 1);
            } catch (err) {
              console.warn("Invalid JSON chunk:", jsonStr);
            }
          } else if (line.startsWith("meta:")) {
            const meta = JSON.parse(line.replace("meta:", "").trim());
            if (meta.total) setTotalPermutations(meta.total);
            if (meta.attempted) setAttemptedCount(meta.attempted);
          }
        }
  
        buffer = parts[parts.length - 1];
      }
  
      toast({
        title: "Analysis complete",
        description: `Fetched DNS data for ${cleanDomain}`,
      });
  
    } catch (error: any) {
      if (error?.message !== "The user aborted a request.") {
        setResults([]);
        toast({
          title: "Error",
          description: `Failed to fetch DNS data: ${error.message}`,
          variant: "destructive",
        });
      }
    } finally {
      setIsAnalyzing(false);
      readerRef.current = null;
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="bg-blue-600 text-white shadow-md">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
        <a href="/dashboard" className="flex items-center">
          <img src="/newlogo.png" alt="Connect Reseller logo" className="h-10 filter brightness-0 invert" />
        </a>

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
        className={`text-white ${isAnalyzing ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
      >
        {isAnalyzing ? "Stop" : "Analyze Domain"}
      </Button>

      </form>

      {isAnalyzing && (
        <div className="mt-4">
          <p className="text-sm mb-2 text-gray-500">
            Scanning {attemptedCount} {totalPermutations ? `of ${totalPermutations}` : ""}
          </p>
          <Progress
            value={totalPermutations ? (attemptedCount / totalPermutations) * 100 : undefined}
            className="bg-gray-200 rounded-full h-4 [&>div]:bg-blue-600"
          />
        </div>
      )}
      {!isAnalyzing && results.length > 0 && (
        <p className="text-sm text-gray-600 mt-4">
          Scanned {totalPermutations} permutations. Found {results.length} registered.
        </p>
      )}
    </CardContent>
  </Card>

  {results.length > 0 && (
    <>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 flex-wrap">
          {/* Search input */}
          <Input
            type="text"
            placeholder="Search a domain from results"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="md:w-1/3"
          />
          <div className="flex gap-2">
          {/* Filter dropdown */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-white dark:bg-background md:w-1/2"
          >
            <option value="all">All Results</option>
            {[...new Set(results.map(r => r.permutationType))]
              .filter(type => type)
              .map((type, idx) => (
                <option key={idx} value={type}>
                  {type}
                </option>
              ))}
          </select>

          {/* Download buttons */}

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
            <Tooltip>
              <TooltipTrigger asChild>
                <TableHead>Permutation</TableHead>
              </TooltipTrigger>
              <TooltipContent>
                The modified domain being analyzed.
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <TableHead>IP Address</TableHead>
              </TooltipTrigger>
              <TooltipContent>
                The domain’s resolved IPv4 and IPv6 addresses, along with its geolocated country.
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <TableHead>Name Server</TableHead>
              </TooltipTrigger>
              <TooltipContent>
                The authoritative name servers for the domain (via NS record).
              </TooltipContent>
            </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TableHead>Mail Server</TableHead>
                </TooltipTrigger>
                <TooltipContent>
                  The mail servers handling email for the domain (via MX record).
                </TooltipContent>
              </Tooltip>

            </TableRow>
          </TableHeader>
          <TableBody>
          {loadingResults && results.length === 0 && (
            <>
              {[...Array(5)].map((_, idx) => (
                <TableRow key={`loading-${idx}`}>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                </TableRow>
              ))}
            </>
          )}
          {results
          .filter((result) => {
            const matchesSearch = result.permutation.toLowerCase().includes(searchTerm.toLowerCase());
            const isError = !!result.error;

            if (filterType === "all") return matchesSearch;
            if (filterType === "registered") return matchesSearch && !isError;
            if (filterType === "error") return matchesSearch && isError;
            return matchesSearch && result.permutationType === filterType;
          })
          .map((result, index) => {
              const isError = !!result.error;

          return (
            <TableRow key={index}>
              {/* Domain + Type */}
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-xs text-gray-500">{result.permutationType}</div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {getPermutationExplanation(result.permutationType)}
                  </TooltipContent>
                </Tooltip>
              </TableCell>

              {/* IP Address */}
              <TableCell>
                {isError ? (
                  <span className="text-sm">🚫</span>
                ) : (
                  <>
                    <div>{result.ip || "-"}</div>
                    <div>{result.ipv6 || "-"}</div>
                    <div className="text-xs text-gray-500">{result.country || "-"}</div>
                  </>
                )}
              </TableCell>

              {/* Name Server */}
              <TableCell>
                {result.nameServer}
              </TableCell>

              {/* Mail Server */}
              <TableCell>
                {result.mailServer}
              </TableCell>
            </TableRow>
          );
        })}
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