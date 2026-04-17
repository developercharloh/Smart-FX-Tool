import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/AppLayout";
import { ChartProvider } from "@/contexts/ChartContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AccessGate } from "@/components/AccessGate";

import Dashboard from "@/pages/dashboard";
import SignalsList from "@/pages/signals/index";
import SignalDetail from "@/pages/signals/detail";
import Analyze from "@/pages/analyze/index";
import MarketNews from "@/pages/news/index";
import AdminPanel from "@/pages/admin/index";
import SettingsPage from "@/pages/settings/index";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    }
  }
});

function AuthenticatedApp() {
  const { authenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return <AccessGate />;
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/signals" component={SignalsList} />
        <Route path="/signals/:id" component={SignalDetail} />
        <Route path="/analyze" component={Analyze} />
        <Route path="/news" component={MarketNews} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/xk-manage" component={AdminPanel} />
      <Route component={AuthenticatedApp} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ChartProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </ChartProvider>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
