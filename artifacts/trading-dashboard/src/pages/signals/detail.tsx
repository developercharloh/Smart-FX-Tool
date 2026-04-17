import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetSignal, getGetSignalQueryKey, useDeleteSignal } from "@workspace/api-client-react";
import { ArrowLeft, Trash2, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SignalCard } from "@/components/shared/SignalCard";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type SignalStatus = "ACTIVE" | "HIT_TP" | "HIT_SL" | "EXPIRED";

const STATUS_BUTTONS: { status: SignalStatus; label: string; icon: any; cls: string }[] = [
  { status: "HIT_TP",  label: "TP Hit",  icon: CheckCircle2, cls: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20" },
  { status: "HIT_SL",  label: "SL Hit",  icon: XCircle,      cls: "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20" },
  { status: "EXPIRED", label: "Expired", icon: Clock,         cls: "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20" },
  { status: "ACTIVE",  label: "Active",  icon: RefreshCw,     cls: "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20" },
];

export default function SignalDetail() {
  const params     = useParams();
  const id         = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast }  = useToast();
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState<SignalStatus | null>(null);

  const { data: signal, isLoading } = useGetSignal(id, {
    query: { enabled: !!id, queryKey: getGetSignalQueryKey(id) }
  });

  const deleteMutation = useDeleteSignal();

  async function updateStatus(status: SignalStatus) {
    setUpdating(status);
    try {
      const res = await fetch(`${API_BASE}/api/signals/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: getGetSignalQueryKey(id) });
        await queryClient.invalidateQueries({ queryKey: ["signals"] });
        toast({ title: "Status updated", description: `Signal marked as ${status.replace("_", " ")}.` });
      } else {
        throw new Error();
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not update status." });
    } finally { setUpdating(null); }
  }

  const handleDelete = () => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => { toast({ title: "Signal deleted" }); setLocation("/signals"); },
      onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to delete signal." }),
    });
  };

  if (isLoading) return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-10 w-[200px]" />
      <Skeleton className="h-[500px] w-full rounded-xl bg-card/50" />
    </div>
  );

  if (!signal) return (
    <div className="max-w-4xl mx-auto text-center py-20 bg-card/20 rounded-xl border border-dashed border-border">
      <h2 className="text-2xl font-bold font-mono">Signal Not Found</h2>
      <p className="text-muted-foreground mt-2 mb-6">The requested signal could not be found or has been deleted.</p>
      <Link href="/signals"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Signals</Button></Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <Link href="/signals" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to All Signals
        </Link>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this signal?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <SignalCard signal={signal} detailed className="w-full" />

      {/* Outcome tracking */}
      <div className="rounded-xl border border-border/40 bg-card/30 p-5 space-y-3">
        <div>
          <p className="text-sm font-bold">Mark Outcome</p>
          <p className="text-xs text-muted-foreground mt-0.5">Update this signal's result to track your win rate.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STATUS_BUTTONS.map(btn => {
            const Icon = btn.icon;
            const isActive = signal.status === btn.status;
            return (
              <button
                key={btn.status}
                onClick={() => updateStatus(btn.status)}
                disabled={!!updating || isActive}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-bold transition-all",
                  btn.cls,
                  isActive && "ring-2 ring-current ring-offset-1 ring-offset-background",
                  (!!updating && !isActive) && "opacity-40 cursor-not-allowed"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", updating === btn.status && "animate-spin")} />
                {isActive ? `✓ ${btn.label}` : btn.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
