import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { useProjects } from "@/hooks/use-projects";
import { useAuth } from "@/hooks/use-auth";
import { Building2, Activity, ArrowUpRight, MapPin, CalendarClock } from "lucide-react";
import { Link } from "wouter";
import { format, isFuture, isToday } from "date-fns";
import { ProjectMap } from "@/components/map/ProjectMap";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { user } = useAuth();

  const firstName = user?.firstName || user?.email?.split("@")[0] || "there";
  const allProjects = projects ?? [];
  const completedCount = allProjects.filter(p => p.status === "completed").length;
  const plannedCount = allProjects.filter(p => p.status === "planned").length;

  return (
    <ProtectedLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          Welcome back, {firstName} 👋
        </h1>
        <p className="text-muted-foreground">Here's an overview of your construction portfolio.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Projects", value: stats?.totalProjects, icon: Building2, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "In Progress", value: stats?.activeProjects, icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Planned", value: plannedCount, icon: CalendarClock, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Completed", value: completedCount, icon: Building2, color: "text-violet-500", bg: "bg-violet-500/10" },
        ].map((stat, i) => (
          <div key={i} className="bg-card rounded-2xl p-5 shadow-sm border border-border/50 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`p-3 rounded-xl ${stat.bg} shrink-0`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <h3 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                {statsLoading ? "–" : stat.value ?? 0}
              </h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Projects list */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Your Projects</h2>
            <Link href="/projects" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              All <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            {projectsLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
            ) : allProjects.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">No projects yet.</p>
                <Link href="/projects" className="text-sm text-primary font-medium hover:underline mt-2 inline-block">
                  Create your first project →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border/50 max-h-[460px] overflow-y-auto">
                {allProjects.slice(0, 8).map(project => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        project.status === "active" ? "bg-emerald-500" :
                        project.status === "completed" ? "bg-blue-500" : "bg-amber-500"
                      }`} />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                          {project.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{project.client}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${
                      project.status === "active" ? "bg-emerald-500/10 text-emerald-600" :
                      project.status === "completed" ? "bg-blue-500/10 text-blue-600" :
                      "bg-amber-500/10 text-amber-600"
                    }`}>
                      {project.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live map */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Live Map</h2>
            <Link href="/map" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              Full map <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            {projectsLoading ? (
              <div className="h-[460px] flex items-center justify-center text-muted-foreground">
                Loading map…
              </div>
            ) : allProjects.length === 0 ? (
              <div className="h-[460px] flex flex-col items-center justify-center text-muted-foreground">
                <MapPin className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-sm">Projects will appear here once created.</p>
              </div>
            ) : (
              <ProjectMap projects={allProjects as any} height="460px" interactive={true} />
            )}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
