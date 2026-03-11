import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { useProjects } from "@/hooks/use-projects";
import { Building2, Activity, CalendarClock, ArrowUpRight, MapPin } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: projects, isLoading: projectsLoading } = useProjects();

  const activeProjects = projects?.filter(p => p.status === 'active').slice(0, 4) || [];

  return (
    <ProtectedLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Overview
        </h1>
        <p className="text-muted-foreground">Welcome back. Here's what's happening across your sites today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: "Total Projects", value: stats?.totalProjects, icon: Building2, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Active Sites", value: stats?.activeProjects, icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Upcoming Visits", value: stats?.upcomingVisits, icon: CalendarClock, color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map((stat, i) => (
          <div key={i} className="bg-card rounded-2xl p-6 shadow-sm border border-border/50 flex items-center gap-5 hover:shadow-md transition-shadow">
            <div className={`p-4 rounded-xl ${stat.bg}`}>
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
              <h3 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                {statsLoading ? "-" : stat.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Active Projects */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Active Sites</h2>
            <Link href="/projects" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            {projectsLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading projects...</div>
            ) : activeProjects.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No active projects found.</div>
            ) : (
              <div className="divide-y divide-border/50">
                {activeProjects.map(project => (
                  <Link key={project.id} href={`/projects/${project.id}`} className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 p-3 rounded-lg text-primary mt-1">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{project.name}</h4>
                        <p className="text-sm text-muted-foreground">{project.client}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600">
                        Active
                      </span>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(project.createdAt!), "MMM d, yyyy")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Action / Map Teaser */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-display)' }}>Geographic Overview</h2>
          <Link href="/map" className="block relative bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden group h-[400px]">
            {/* Mock map background for teaser */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=800')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-700"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent"></div>
            
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="bg-background/90 backdrop-blur-sm p-6 rounded-xl border border-border/50 shadow-lg flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-foreground mb-1">Interactive Map</h3>
                  <p className="text-sm text-muted-foreground">View all {stats?.totalProjects || 0} sites geographically</p>
                </div>
                <div className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center shadow-md group-hover:translate-x-1 transition-transform">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </ProtectedLayout>
  );
}
