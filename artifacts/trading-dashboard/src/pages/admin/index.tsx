import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Terminal, Key, ShieldAlert, Loader2, Plus, Trash2, PowerOff, Power, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Admin() {
  const [secret, setSecret] = useState(localStorage.getItem("sfx_admin_secret") || "");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [keys, setKeys] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [newPlan, setNewPlan] = useState("PRO");
  const [newLabel, setNewLabel] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const fetchKeys = async (adminSecret: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/keys", {
        headers: { "x-admin-secret": adminSecret }
      });
      if (!res.ok) throw new Error("Invalid secret");
      const data = await res.json();
      setKeys(data);
      setIsAuthenticated(true);
      localStorage.setItem("sfx_admin_secret", adminSecret);
    } catch (e) {
      setIsAuthenticated(false);
      localStorage.removeItem("sfx_admin_secret");
      if (secret) {
        toast({ title: "Access Denied", variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (secret) {
      fetchKeys(secret);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchKeys(secret);
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "x-admin-secret": secret, "Content-Type": "application/json" },
        body: JSON.stringify({ plan: newPlan, label: newLabel || undefined })
      });
      if (res.ok) {
        toast({ title: "Key Created" });
        setNewLabel("");
        fetchKeys(secret);
      } else {
        toast({ title: "Creation Failed", variant: "destructive" });
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleAction = async (id: number, action: string, body?: any) => {
    let method = "PATCH";
    let url = `/api/admin/keys/${id}/${action}`;
    
    if (action === "delete") {
      method = "DELETE";
      url = `/api/admin/keys/${id}`;
      if (!confirm("Delete this key entirely?")) return;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          "x-admin-secret": secret,
          ...(body ? { "Content-Type": "application/json" } : {})
        },
        body: body ? JSON.stringify(body) : undefined
      });
      if (res.ok) {
        toast({ title: `Action '${action}' successful` });
        fetchKeys(secret);
      } else {
        toast({ title: "Action Failed", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 border-destructive/50 bg-background shadow-[0_0_50px_rgba(220,38,38,0.1)]">
          <div className="flex flex-col items-center mb-8 text-destructive">
            <ShieldAlert className="w-12 h-12 mb-4" />
            <h1 className="text-xl font-bold font-mono tracking-widest uppercase">Admin Override</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input 
              type="password" 
              placeholder="Enter God-Mode Secret" 
              className="font-mono text-center tracking-widest bg-background"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
            <Button type="submit" variant="destructive" className="w-full uppercase tracking-widest font-bold">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Authenticate"}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-widest uppercase flex items-center gap-2 text-primary">
            <Terminal className="w-6 h-6" />
            Access Key Management
          </h1>
          <p className="text-muted-foreground text-sm font-mono mt-1 uppercase">Root Control Panel</p>
        </div>
        <Button variant="outline" size="sm" className="font-mono text-xs" onClick={() => {
          setIsAuthenticated(false);
          setSecret("");
          localStorage.removeItem("sfx_admin_secret");
        }}>
          Exit Admin
        </Button>
      </div>

      <Card className="p-4 bg-card/40 border-border/50 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 space-y-2">
          <label className="text-xs uppercase font-mono text-muted-foreground">Label (Optional)</label>
          <Input 
            placeholder="e.g. VIP User 1" 
            className="font-mono bg-background"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
        </div>
        <div className="w-48 space-y-2">
          <label className="text-xs uppercase font-mono text-muted-foreground">Plan</label>
          <Select value={newPlan} onValueChange={setNewPlan}>
            <SelectTrigger className="font-mono bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BASIC">BASIC</SelectItem>
              <SelectItem value="PRO">PRO</SelectItem>
              <SelectItem value="LIFETIME">LIFETIME</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleCreate} disabled={isCreating} className="w-32 uppercase tracking-widest font-bold">
          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-2"/> Create</>}
        </Button>
      </Card>

      <div className="border border-border/50 rounded-sm bg-card/30 overflow-x-auto">
        <table className="w-full text-sm text-left font-mono">
          <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border/50">
            <tr>
              <th className="px-4 py-3 font-normal">Key String</th>
              <th className="px-4 py-3 font-normal">Plan & Label</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">Expires</th>
              <th className="px-4 py-3 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {keys.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground uppercase text-xs tracking-widest">
                  No keys found in database
                </td>
              </tr>
            ) : (
              keys.map((k: any) => (
                <tr key={k.id} className="hover:bg-card/80 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-muted-foreground" />
                      <span className="font-bold">{k.key}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-primary">{k.plan}</div>
                    {k.label && <div className="text-xs text-muted-foreground mt-0.5">{k.label}</div>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider ${
                      k.status === 'ACTIVE' ? 'bg-chart-2/20 text-chart-2' : 
                      k.status === 'REVOKED' ? 'bg-destructive/20 text-destructive' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {k.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                    {k.expiresAt ? format(new Date(k.expiresAt), "MMM dd, yyyy HH:mm") : "NEVER"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right space-x-2">
                    {k.status === 'ACTIVE' ? (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/20" onClick={() => handleAction(k.id, 'revoke')} title="Revoke">
                        <PowerOff className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-chart-2 hover:bg-chart-2/20" onClick={() => handleAction(k.id, 'activate')} title="Activate">
                        <Power className="w-4 h-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/20" onClick={() => handleAction(k.id, 'extend', { days: 30 })} title="Extend 30 Days">
                      <Clock className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleAction(k.id, 'delete')} title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
