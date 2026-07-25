import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

// ── Types ────────────────────────────────────────────────────────────────────

export type MT5ExecutionStatus = "approved" | "picked_up" | "executed" | "failed" | "cancelled";

export interface MT5Execution {
  id: number;
  pair: string;
  signal: "BUY" | "SELL";
  timeframe: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskPercent: number;
  confidenceScore: number;
  riskRewardRatio: number;
  status: MT5ExecutionStatus;
  eaTicket: number | null;
  eaLots: number | null;
  eaPrice: number | null;
  eaError: string | null;
  executedAt: string | null;
  createdAt: string;
}

export interface QueuePayload {
  pair: string;
  signal: "BUY" | "SELL";
  timeframe: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskPercent: number;
  confidenceScore: number;
  riskRewardRatio: number;
}

// ── API helpers ──────────────────────────────────────────────────────────────

async function fetchExecutions(): Promise<MT5Execution[]> {
  const res = await fetch(`${BASE}api/mt5/executions`);
  if (!res.ok) throw new Error("Failed to fetch MT5 executions");
  return res.json();
}

async function queueExecution(payload: QueuePayload): Promise<MT5Execution> {
  const res = await fetch(`${BASE}api/mt5/queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? "Failed to queue execution");
  }
  return res.json();
}

async function cancelExecution(id: number): Promise<MT5Execution> {
  const res = await fetch(`${BASE}api/mt5/executions/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? "Failed to cancel execution");
  }
  return res.json();
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useMT5Executions() {
  return useQuery<MT5Execution[]>({
    queryKey: ["mt5-executions"],
    queryFn: fetchExecutions,
    refetchInterval: 5000, // poll every 5s to catch EA updates
    staleTime: 2000,
  });
}

export function useQueueMT5() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: queueExecution,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mt5-executions"] }),
  });
}

export function useCancelMT5() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelExecution,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mt5-executions"] }),
  });
}
