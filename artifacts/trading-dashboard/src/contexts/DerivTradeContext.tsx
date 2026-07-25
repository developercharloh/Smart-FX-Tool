import { createContext, useContext, ReactNode } from "react";
import { useDerivTrade } from "@/hooks/useDerivTrade";

type DerivTradeCtx = ReturnType<typeof useDerivTrade>;

const Ctx = createContext<DerivTradeCtx | null>(null);

export function DerivTradeProvider({ children }: { children: ReactNode }) {
  const value = useDerivTrade();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDerivTradeCtx() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDerivTradeCtx must be used inside DerivTradeProvider");
  return ctx;
}
