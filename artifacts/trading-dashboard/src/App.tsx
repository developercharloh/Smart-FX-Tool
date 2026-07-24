import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Layout } from '@/components/layout';
import VerifyKey from '@/pages/auth/verify';
import { Loader2 } from 'lucide-react';

// Pages
import Dashboard from '@/pages/dashboard';
import SignalsList from '@/pages/signals';
import SignalDetail from '@/pages/signals/detail';
import Analyze from '@/pages/analyze';
import News from '@/pages/news';
import Calendar from '@/pages/calendar';
import Admin from '@/pages/admin';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/signals" component={SignalsList} />
      <Route path="/signals/:id" component={SignalDetail} />
      <Route path="/analyze" component={Analyze} />
      <Route path="/news" component={News} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/xk-manage" component={Admin} />
      <Route>
        <div className="flex items-center justify-center h-full text-muted-foreground uppercase tracking-widest text-sm">
          404 // Signal Not Found
        </div>
      </Route>
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, login, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-primary">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <VerifyKey onLogin={login} />;
  }

  return (
    <Layout onLogout={logout}>
      <Router />
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AppContent />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
