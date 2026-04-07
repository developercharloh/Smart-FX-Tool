import { createContext, useContext, useState, ReactNode } from "react";

interface ChartContextType {
  pair: string;
  timeframe: string;
  setPair: (p: string) => void;
  setTimeframe: (t: string) => void;
}

const ChartContext = createContext<ChartContextType>({
  pair: "",
  timeframe: "H1",
  setPair: () => {},
  setTimeframe: () => {},
});

export function ChartProvider({ children }: { children: ReactNode }) {
  const [pair, setPair] = useState("");
  const [timeframe, setTimeframe] = useState("H1");

  return (
    <ChartContext.Provider value={{ pair, timeframe, setPair, setTimeframe }}>
      {children}
    </ChartContext.Provider>
  );
}

export const useChart = () => useContext(ChartContext);
