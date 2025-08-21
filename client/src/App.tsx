import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import CodeRedSelection from "@/pages/code-red-selection";
import Dashboard from "@/pages/dashboard";
import RunnerDashboard from "@/pages/runner";
import LabDashboard from "@/pages/lab";
import ClinicianDashboard from "@/pages/clinician";
import NotFound from "@/pages/not-found";
import AuditPage from "@/pages/audit";
import { useEffect } from "react"; // Make sure this import is here

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/code-red-selection" component={CodeRedSelection} />
      <Route path="/lab" component={LabDashboard} />
      <Route path="/runner" component={RunnerDashboard} />
      <Route path="/clinician" component={ClinicianDashboard} />
      <Route path="/audit" component={AuditPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // THIS IS THE useEffect HOOK WE NEED TO FIX
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host;
    const wsUrl = `${protocol}://${host}`;
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'RELOAD_STATE') {
        queryClient.invalidateQueries();
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      ws.close();
    };
  }, []); // The empty array [] here is important

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
