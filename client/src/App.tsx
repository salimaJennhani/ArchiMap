import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import ProjectList from "@/pages/projects/ProjectList";
import ProjectDetail from "@/pages/projects/ProjectDetail";
import MapPage from "@/pages/Map";
import VisitsPage from "@/pages/Visits";
import DocumentsPage from "@/pages/Documents";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/projects" component={ProjectList} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/visits" component={VisitsPage} />
      <Route path="/documents" component={DocumentsPage} />
      <Route path="/map" component={MapPage} />
      <Route component={Login} />
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
