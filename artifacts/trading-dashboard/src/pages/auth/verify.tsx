import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Terminal, KeyRound, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VerifyKeyProps {
  onLogin: (key: string) => Promise<boolean>;
}

export default function VerifyKey({ onLogin }: VerifyKeyProps) {
  const [key, setKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    setIsLoading(true);
    const success = await onLogin(key.trim());
    setIsLoading(false);

    if (!success) {
      toast({
        title: "Access Denied",
        description: "Invalid or expired access key.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground font-mono">
      <div className="w-full max-w-md p-8 border border-border bg-card shadow-2xl rounded-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Terminal className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-widest uppercase">Smart FX Terminal</h1>
          <p className="text-xs text-muted-foreground mt-2">v2.4.0 // Restricted Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Access Key</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Enter your key..."
                className="pl-10 font-mono bg-background border-border focus-visible:ring-primary h-12"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 uppercase tracking-widest font-bold" 
            disabled={isLoading || !key.trim()}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authenticate"}
          </Button>
        </form>

        <div className="mt-8 text-center text-[10px] text-muted-foreground uppercase tracking-widest">
          Secured connection &bull; E2E Encrypted
        </div>
      </div>
    </div>
  );
}
