import { useState, useCallback } from "react";

const KEY     = "smartfx_analysis_history";
const MAX     = 5;

export interface HistoryEntry {
  id:         string;
  pair:       string;
  timeframe:  string;
  signal:     string;
  confidence: number;
  entry:      number;
  savedAt:    number;
  result:     any;
}

function load(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

function save(entries: HistoryEntry[]) {
  try { localStorage.setItem(KEY, JSON.stringify(entries)); } catch {}
}

export function useAnalysisHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>(load);

  const push = useCallback((result: any) => {
    if (!result?.pair || !result?.signal) return;
    const entry: HistoryEntry = {
      id:         `${result.pair}-${result.timeframe}-${Date.now()}`,
      pair:       result.pair,
      timeframe:  result.timeframe,
      signal:     result.signal,
      confidence: result.confidenceScore ?? 0,
      entry:      result.entry ?? 0,
      savedAt:    Date.now(),
      result,
    };
    setHistory(prev => {
      const next = [entry, ...prev.filter(e => e.id !== entry.id)].slice(0, MAX);
      save(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
    save([]);
  }, []);

  return { history, push, clear };
}
