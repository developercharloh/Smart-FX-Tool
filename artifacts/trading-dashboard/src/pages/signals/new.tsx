import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation, Link } from "wouter";
import { useCreateSignal, useListPairs, CreateSignalBodySignal, CreateSignalBodyStructureType, CreateSignalBodyTrend } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  pair: z.string().min(1, "Required"),
  signal: z.enum(["BUY", "SELL"] as const),
  timeframe: z.string().min(1, "Required"),
  entry: z.coerce.number().positive("Must be positive"),
  stopLoss: z.coerce.number().positive("Must be positive"),
  takeProfit: z.coerce.number().positive("Must be positive"),
  confidenceScore: z.coerce.number().min(0).max(100),
  reasons: z.string().min(1, "Provide at least one reason (comma separated)"),
  structureType: z.enum(["BOS", "CHOCH", "NONE"] as const),
  trend: z.enum(["BULLISH", "BEARISH", "NEUTRAL"] as const),
  hasOrderBlock: z.boolean(),
  hasSupportResistance: z.boolean(),
});

export default function NewSignal() {
  const { data: pairs } = useListPairs();
  const createMutation = useCreateSignal();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pair: "",
      signal: "BUY",
      timeframe: "H1",
      entry: 0,
      stopLoss: 0,
      takeProfit: 0,
      confidenceScore: 80,
      reasons: "",
      structureType: "NONE",
      trend: "NEUTRAL",
      hasOrderBlock: false,
      hasSupportResistance: false,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Calculate simple risk reward based on absolute distance
    const risk = Math.abs(values.entry - values.stopLoss);
    const reward = Math.abs(values.takeProfit - values.entry);
    const rr = risk > 0 ? reward / risk : 0;

    createMutation.mutate({
      data: {
        ...values,
        reasons: values.reasons.split(",").map(r => r.trim()).filter(Boolean),
        riskRewardRatio: rr,
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Signal Created",
          description: "Your manual signal has been saved."
        });
        setLocation("/signals");
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to create signal. Check your inputs."
        });
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/signals">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono">Manual Signal</h1>
          <p className="text-muted-foreground mt-1">Record a trading opportunity based on your own analysis.</p>
        </div>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="pair"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Pair</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-border/50 font-mono">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pairs?.map(p => (
                            <SelectItem key={p.symbol} value={p.symbol}>{p.symbol}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="signal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Direction</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-border/50 font-bold">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BUY" className="text-emerald-500 font-bold">BUY</SelectItem>
                          <SelectItem value="SELL" className="text-rose-500 font-bold">SELL</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timeframe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Timeframe</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-border/50 font-mono">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="M15">M15</SelectItem>
                          <SelectItem value="H1">H1</SelectItem>
                          <SelectItem value="H4">H4</SelectItem>
                          <SelectItem value="D1">D1</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-secondary/30 p-4 rounded-xl border border-border/30">
                <FormField
                  control={form.control}
                  name="entry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Entry Price</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.00001" className="font-mono bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stopLoss"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider font-semibold text-rose-500/70">Stop Loss</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.00001" className="font-mono bg-background text-rose-500" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="takeProfit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider font-semibold text-emerald-500/70">Take Profit</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.00001" className="font-mono bg-background text-emerald-500" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="confidenceScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Confidence Score (0-100)</FormLabel>
                      <FormControl>
                        <Input type="number" className="bg-background font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trend"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Current Trend</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-border/50">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BULLISH">BULLISH</SelectItem>
                          <SelectItem value="BEARISH">BEARISH</SelectItem>
                          <SelectItem value="NEUTRAL">NEUTRAL</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="structureType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Market Structure</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-border/50">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NONE">None</SelectItem>
                          <SelectItem value="BOS">Break of Structure (BOS)</SelectItem>
                          <SelectItem value="CHOCH">Change of Character (CHoCH)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reasons"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Confluence Reasons (comma separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Key level bounce, RSI divergence" className="bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-6 border border-border/50 rounded-xl p-4 bg-background/50">
                <FormField
                  control={form.control}
                  name="hasOrderBlock"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-primary data-[state=checked]:bg-primary"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-semibold text-sm">
                          Order Block Present
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasSupportResistance"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-primary data-[state=checked]:bg-primary"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-semibold text-sm">
                          Key S/R Level
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full font-bold shadow-lg" size="lg" disabled={createMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {createMutation.isPending ? "Saving..." : "Save Signal"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
