
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";

type DomainResult = {
  permutation: string;
  ip: string;
  nameServer: string;
  mailServer: string;
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [domain, setDomain] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<DomainResult[]>([]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      toast({
        title: "Logout failed",
        description: `${error}`,
        variant: "destructive",
      });
    }
  };

  const generatePermutations = (domain: string): string[] => {
    const [name, tld] = domain.split(".");
    if (!tld) return [];
    
    const permutations: string[] = [];
    
    // Character omission (removing one character at a time)
    for (let i = 0; i < name.length; i++) {
      const omitted = name.slice(0, i) + name.slice(i + 1);
      permutations.push(`${omitted}.${tld}`);
    }
    
    // Character transposition (swapping adjacent characters)
    for (let i = 0; i < name.length - 1; i++) {
      const transposed = 
        name.slice(0, i) + 
        name[i + 1] + 
        name[i] + 
        name.slice(i + 2);
      permutations.push(`${transposed}.${tld}`);
    }
    
    // Character replacement (replacing with adjacent keyboard characters)
    const keyboardMap: Record<string, string[]> = {
      'a': ['s', 'q', 'z'],
      'b': ['v', 'g', 'n'],
      'c': ['x', 'd', 'v'],
      'd': ['s', 'f', 'e', 'c'],
      'e': ['w', 'r', 'd'],
      'f': ['d', 'g', 'r', 'v'],
      'g': ['f', 'h', 't', 'b'],
      'h': ['g', 'j', 'y', 'n'],
      'i': ['u', 'o', 'k'],
      'j': ['h', 'k', 'u', 'm'],
      'k': ['j', 'l', 'i'],
      'l': ['k', 'o', 'p'],
      'm': ['n', 'j'],
      'n': ['b', 'm', 'h'],
      'o': ['i', 'p', 'l'],
      'p': ['o', 'l'],
      'q': ['w', 'a'],
      'r': ['e', 't', 'f'],
      's': ['a', 'd', 'w', 'x'],
      't': ['r', 'y', 'g'],
      'u': ['y', 'i', 'j'],
      'v': ['c', 'f', 'b'],
      'w': ['q', 'e', 's'],
      'x': ['z', 'c', 's'],
      'y': ['t', 'u', 'h'],
      'z': ['a', 'x']
    };
    
    for (let i = 0; i < name.length; i++) {
      const char = name[i].toLowerCase();
      const adjacentChars = keyboardMap[char] || [];
      
      for (const adjacent of adjacentChars) {
        const replaced = 
          name.slice(0, i) + 
          adjacent + 
          name.slice(i + 1);
        permutations.push(`${replaced}.${tld}`);
      }
    }
    
    // Add character insertion
    for (let i = 0; i <= name.length; i++) {
      for (const char of 'abcdefghijklmnopqrstuvwxyz') {
        const inserted = 
          name.slice(0, i) + 
          char + 
          name.slice(i);
        permutations.push(`${inserted}.${tld}`);
      }
    }
    
    // Add common TLD variations
    const commonTlds = ['com', 'net', 'org', 'io', 'co', 'app', 'dev'];
    for (const newTld of commonTlds) {
      if (newTld !== tld) {
        permutations.push(`${name}.${newTld}`);
      }
    }
    
    // Homoglyph substitutions (visually similar characters)
    const homoglyphs: Record<string, string[]> = {
      'a': ['à', 'á', 'â', 'ä', 'å', 'ą', 'ã'],
      'b': ['d', 'lb', 'ib'],
      'c': ['e', 'o'],
      'd': ['b', 'cl', 'dl', 'cl'],
      'e': ['c', 'é', 'è', 'ê', 'ë', 'ę'],
      'g': ['q', '9'],
      'i': ['1', 'l', 'j', '!', 'í', 'ì', 'î', 'ï'],
      'l': ['1', 'i', 'ł'],
      'm': ['n', 'rn', 'nn'],
      'n': ['m', 'r', 'ñ'],
      'o': ['0', 'ó', 'ò', 'ô', 'ö', 'õ', 'ø'],
      's': ['5', '$'],
      'u': ['v', 'ú', 'ù', 'û', 'ü'],
      'v': ['u', 'w'],
      'w': ['vv', 'v'],
      'y': ['j']
    };
    
    for (let i = 0; i < name.length; i++) {
      const char = name[i].toLowerCase();
      const similarChars = homoglyphs[char] || [];
      
      for (const similar of similarChars) {
        const replaced = 
          name.slice(0, i) + 
          similar + 
          name.slice(i + 1);
        permutations.push(`${replaced}.${tld}`);
      }
    }
    
    // Return unique permutations only
    return [...new Set(permutations)].slice(0, 20); // Limit for demo
  };

  const simulateDnsLookup = (domain: string): Promise<Partial<DomainResult>> => {
    // This is a mock function that simulates DNS lookups
    return new Promise((resolve) => {
      setTimeout(() => {
        // For demo purposes, randomly determine if the domain exists
        const exists = Math.random() > 0.7;
        
        if (exists) {
          resolve({
            ip: `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
            nameServer: Math.random() > 0.5 ? `ns${Math.floor(Math.random() * 3) + 1}.hostingcompany.com` : '',
            mailServer: Math.random() > 0.6 ? `mail.${domain}` : '',
          });
        } else {
          resolve({
            ip: '',
            nameServer: '',
            mailServer: '',
          });
        }
      }, 100);
    });
  };

  const analyzeDomain = async () => {
    if (!domain) {
      toast({
        title: "Error",
        description: "Please enter a domain",
        variant: "destructive",
      });
      return;
    }

    const cleanDomain = domain.trim().toLowerCase();
    if (!cleanDomain.includes('.')) {
      toast({
        title: "Invalid domain",
        description: "Please include a TLD (e.g., example.com)",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);
    setResults([]);
    toast({
      title: "Analysis started",
      description: "Generating domain permutations...",
    });

    try {
      // Generate permutations
      const permutations = generatePermutations(cleanDomain);
      
      if (permutations.length === 0) {
        throw new Error("Could not generate permutations");
      }

      toast({
        title: "Permutations generated",
        description: `Found ${permutations.length} potential variations`,
      });

      // Process each permutation
      const newResults: DomainResult[] = [];
      
      for (let i = 0; i < permutations.length; i++) {
        const permutation = permutations[i];
        const dnsResult = await simulateDnsLookup(permutation);
        
        newResults.push({
          permutation,
          ip: dnsResult.ip || '-',
          nameServer: dnsResult.nameServer || '-',
          mailServer: dnsResult.mailServer || '-',
        });
        
        setProgress(((i + 1) / permutations.length) * 100);
        setResults([...newResults]);
      }

      toast({
        title: "Analysis complete",
        description: `Analyzed ${permutations.length} domain variations`,
      });
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: `${error}`,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setProgress(100);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-blue-600 text-white shadow-md">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <img src="/newlogo.png" alt="Typo Detective Logo" className="h-10 filter brightness-0 invert" />
          <div className="flex items-center gap-4">
            <span className="text-white">Hello, {user?.email}</span>
            <Button 
              className="bg-white text-black border border-black hover:bg-gray-200 hover:scale-105 transition-all hover:shadow-lg" 
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>



      <main className="container mx-auto py-8 px-4">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Domain Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <Input
                type="text"
                placeholder="Enter domain (e.g., example.com)"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="flex-grow"
                disabled={isAnalyzing}
              />
              <Button 
                onClick={analyzeDomain} 
                disabled={isAnalyzing}
                className="whitespace-nowrap"
              >
                {isAnalyzing ? "Analyzing..." : "Analyze Domain"}
              </Button>
            </div>
            
            {isAnalyzing && (
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Analyzing domain variations</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain Variation</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Name Server</TableHead>
                      <TableHead>Mail Server</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, index) => (
                      <TableRow key={index} className={result.ip !== '-' ? "bg-red-50 dark:bg-red-950/20" : ""}>
                        <TableCell>{result.permutation}</TableCell>
                        <TableCell>{result.ip}</TableCell>
                        <TableCell>{result.nameServer}</TableCell>
                        <TableCell>{result.mailServer}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
