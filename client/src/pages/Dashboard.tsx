import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { useProjects } from "@/hooks/use-projects";
import { useUpcomingVisits } from "@/hooks/use-visits";
import { useAuth } from "@/hooks/use-auth";
import { Building2, Activity, ArrowUpRight, MapPin, CalendarClock, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { format, differenceInDays, isToday, isTomorrow } from "date-fns";
import { ProjectMap } from "@/components/map/ProjectMap";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  planned: "#f59e0b",
  active: "#22c55e",
  completed: "#3b82f6",
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: upcoming, isLoading: visitsLoading } = useUpcomingVisits();
  const { user } = useAuth();

  const firstName = user?.firstName || user?.email?.split("@")[0] || "there";
  const allProjects = projects ?? [];

  const statusCounts = {
    planned: allProjects.filter(p => p.status === "planned").length,
    active: allProjects.filter(p => p.status === "active").length,
    completed: allProjects.filter(p => p.status === "completed").length,
  };

  const pieData = [
    { name: "Planned", value: statusCounts.planned, color: STATUS_COLORS.planned },
    { name: "Active", value: statusCounts.active, color: STATUS_COLORS.active },
    { name: "Completed", value: statusCounts.completed, color: STATUS_COLORS.completed },
  ].filter(d => d.value > 0);

  // Monthly project creation chart (last 6 months)
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      name: format(d, "MMM"),
      year: d.getFullYear(),
      month: d.getMonth(),
      count: 0,
    };
  });
  allProjects.forEach(p => {
    if (!p.createdAt) return;
    const d = new Date(p.createdAt);
    const slot = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth());
    if (slot) slot.count++;
  });

  const getDayLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return { label: "Today", cls: "text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200/50" };
    if (isTomorrow(d)) return { label: "Tomorrow", cls: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200/50" };
    const days = differenceInDays(d, new Date());
    return { label: `In ${days}d`, cls: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200/50" };
  };

  return (
    <ProtectedLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
          Welcome back, {firstName} 👋
        </h1>
        <p className="text-muted-foreground">Here's your construction portfolio at a glance.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Projects", value: statsLoading ? "–" : stats?.totalProjects ?? 0, icon: Building2, color: "text-blue-500", bg: "bg-blue-500/10", sub: `${statusCounts.planned} planned` },
          { label: "In Progress", value: statsLoading ? "–" : stats?.activeProjects ?? 0, icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10", sub: "active sites" },
          { label: "Upcoming Visits", value: statsLoading ? "–" : stats?.upcomingVisits ?? 0, icon: CalendarClock, color: "text-violet-500", bg: "bg-violet-500/10", sub: "scheduled" },
          { label: "Completed", value: statsLoading ? "–" : statusCounts.completed, icon: CheckCircle2, color: "text-teal-500", bg: "bg-teal-500/10", sub: "projects done" },
        ].map((stat, i) => (
          <div key={i} className="bg-card rounded-2xl p-5 shadow-sm border border-border/50 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2.5 rounded-xl ${stat.bg} shrink-0`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
            </div>
            <h3 className="text-3xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              {stat.value}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Projects Created (6 mo.)
            </h2>
          </div>
          {allProjects.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={months} barSize={28}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                  labelStyle={{ fontWeight: 600, fontSize: 13 }}
                  cursor={{ fill: "hsl(var(--muted))" }}
                />
                <Bar dataKey="count" name="Projects" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart */}
        <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm flex flex-col">
          <h2 className="font-bold text-foreground mb-4">Project Status</h2>
          {allProjects.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-semibold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Projects list + upcoming visits + map */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Projects list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Projects</h2>
            <Link href="/projects" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              All <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            {projectsLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
            ) : allProjects.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground mb-2">No projects yet.</p>
                <Link href="/projects" className="text-sm text-primary font-medium">Create your first →</Link>
              </div>
            ) : (
              <div className="divide-y divide-border/50 max-h-72 overflow-y-auto">
                {allProjects.slice(0, 8).map(p => (
                  <Link key={p.id} href={`/projects/${p.id}`}
                    className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        p.status === "active" ? "bg-emerald-500" :
                        p.status === "completed" ? "bg-blue-500" : "bg-amber-500"
                      }`} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.client}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.status === "active" ? "bg-emerald-500/10 text-emerald-600" :
                      p.status === "completed" ? "bg-blue-500/10 text-blue-600" :
                      "bg-amber-500/10 text-amber-600"
                    }`}>{p.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming visits */}
          <div className="flex items-center justify-between mt-2">
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              <Clock className="w-5 h-5 inline-block mr-2 text-violet-500" />Upcoming Visits
            </h2>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            {visitsLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading…</div>
            ) : !upcoming?.length ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No upcoming visits
              </div>
            ) : (
              <div className="divide-y divide-border/50 max-h-56 overflow-y-auto">
                {upcoming.slice(0, 5).map(v => {
                  const { label, cls } = getDayLabel(v.visitDate);
                  return (
                    <Link key={v.visitId} href={`/projects/${v.projectId}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{v.projectName}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(v.visitDate), "EEE, MMM d")}</p>
                      </div>
                      <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full border ${cls}`}>{label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Live Map */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              <MapPin className="w-5 h-5 inline-block mr-2 text-primary" />Live Map
            </h2>
            <Link href="/map" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              Full map <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            {projectsLoading ? (
              <div className="h-[480px] flex items-center justify-center text-muted-foreground text-sm">Loading map…</div>
            ) : allProjects.length === 0 ? (
              <div className="h-[480px] flex flex-col items-center justify-center text-muted-foreground">
                <MapPin className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">Projects will appear on the map once created.</p>
              </div>
            ) : (
              <ProjectMap projects={allProjects as any} height="480px" interactive={true} />
            )}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
