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
import UserCodeRedSelection from "@/components/user-code-red-selection";
import NotFound from "@/pages/not-found";
import AuditPage from "@/pages/audit";

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
