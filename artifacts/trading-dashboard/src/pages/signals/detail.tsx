import { useParams, Link } from "wouter";
import { useGetSignal, getGetSignalQueryKey, useDeleteSignal } from "@workspace/api-client-react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SignalCard } from "@/components/shared/SignalCard";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function SignalDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: signal, isLoading } = useGetSignal(id, {
    query: {
      enabled: !!id,
      queryKey: getGetSignalQueryKey(id)
    }
  });

  const deleteMutation = useDeleteSignal();

  const handleDelete = () => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({
          title: "Signal deleted",
          description: "The signal has been removed from your dashboard."
        });
        setLocation("/signals");
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete signal. Please try again."
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-[500px] w-full rounded-xl bg-card/50" />
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 bg-card/20 rounded-xl border border-dashed border-border">
        <h2 className="text-2xl font-bold font-mono">Signal Not Found</h2>
        <p className="text-muted-foreground mt-2 mb-6">The requested signal could not be found or has been deleted.</p>
        <Link href="/signals">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Signals</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <Link href="/signals" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to All Signals
        </Link>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2">
              <Trash2 className="w-4 h-4" /> Delete Signal
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the signal from your records.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <SignalCard signal={signal} detailed className="w-full" />
    </div>
  );
}
