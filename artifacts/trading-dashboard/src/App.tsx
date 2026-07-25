import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DerivTradeProvider } from "@/contexts/DerivTradeContext";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/AppLayout";
import { ChartProvider } from "@/contexts/ChartContext";

import Dashboard from "@/pages/dashboard";
import SignalsList from "@/pages/signals/index";
import SignalDetail from "@/pages/signals/detail";
import Analyze from "@/pages/analyze/index";
import MarketNews from "@/pages/news/index";
import AdminPanel from "@/pages/admin/index";
import SettingsPage from "@/pages/settings/index";
import RiskCalculator from "@/pages/calculator/index";
import EconomicCalendar from "@/pages/calendar/index";
import SetupPage from "@/pages/setup/index";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    }
  }
});

function MainApp() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/signals" component={SignalsList} />
        <Route path="/signals/:id" component={SignalDetail} />
        <Route path="/analyze" component={Analyze} />
        <Route path="/news" component={MarketNews} />
        <Route path="/calculator" component={RiskCalculator} />
        <Route path="/calendar" component={EconomicCalendar} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/setup"    component={SetupPage}   />

        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/xk-manage" component={AdminPanel} />
      <Route component={MainApp} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ChartProvider>
          <DerivTradeProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </DerivTradeProvider>
        </ChartProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
