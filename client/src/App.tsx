import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Pages
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import ProjectList from "@/pages/projects/ProjectList";
import ProjectDetail from "@/pages/projects/ProjectDetail";
import MapPage from "@/pages/Map";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard}/>
      <Route path="/projects" component={ProjectList}/>
      <Route path="/projects/:id" component={ProjectDetail}/>
      <Route path="/map" component={MapPage}/>
      <Route component={Login} /> {/* Fallback for unknown routes handles Auth landing nicely based on requirement */}
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
