import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useProjects } from "@/hooks/use-projects";
import { ProjectMap } from "@/components/map/ProjectMap";
import { Loader2 } from "lucide-react";

export default function MapPage() {
  const { data: projects, isLoading } = useProjects();

  return (
    <ProtectedLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-display)' }}>Global Network</h1>
        <p className="text-muted-foreground">Geographical overview of all active and planned construction sites.</p>
      </div>

      <div className="bg-card rounded-3xl p-2 shadow-xl border border-border/50 h-[calc(100vh-200px)] min-h-[500px]">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-2xl">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : (
          <ProjectMap projects={projects || []} height="100%" />
        )}
      </div>
    </ProtectedLayout>
  );
}
