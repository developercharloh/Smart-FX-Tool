import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/AppLayout";
import { ChartProvider } from "@/contexts/ChartContext";

import Dashboard from "@/pages/dashboard";
import SignalsList from "@/pages/signals/index";
import SignalDetail from "@/pages/signals/detail";
import NewSignal from "@/pages/signals/new";
import Analyze from "@/pages/analyze/index";
import MarketNews from "@/pages/news/index";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    }
  }
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/signals" component={SignalsList} />
        <Route path="/signals/new" component={NewSignal} />
        <Route path="/signals/:id" component={SignalDetail} />
        <Route path="/analyze" component={Analyze} />
        <Route path="/news" component={MarketNews} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ChartProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </ChartProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
