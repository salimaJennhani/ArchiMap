import { useState } from "react";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProjects } from "@/hooks/use-projects";
import { useCreateVisit, useDeleteVisit } from "@/hooks/use-visits";
import { Link } from "wouter";
import {
  Calendar, Loader2, Plus, Search, Building, MapPin,
  AlertTriangle, Trash2, FileWarning, ChevronRight,
  CalendarCheck, CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format, isFuture, isToday, isPast } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { VisitWithProject } from "@shared/schema";

function useAllVisits() {
  return useQuery<VisitWithProject[]>({
    queryKey: ["/api/visits"],
    queryFn: async () => {
      const res = await fetch("/api/visits", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch visits");
      return res.json();
    },
  });
}

export default function VisitsPage() {
  const { data: visits, isLoading } = useAllVisits();
  const { data: projects } = useProjects();
  const createVisit = useCreateVisit();
  const deleteVisit = useDeleteVisit();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");
  const [isOpen, setIsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; projectId: number } | null>(null);

  // Form state
  const [formProjectId, setFormProjectId] = useState<string>("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formProgress, setFormProgress] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formIssues, setFormIssues] = useState("");

  const filtered = (visits ?? []).filter(v => {
    const matchSearch =
      v.projectName.toLowerCase().includes(search.toLowerCase()) ||
      (v.progressStatus ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (v.notes ?? "").toLowerCase().includes(search.toLowerCase());
    const d = new Date(v.visitDate);
    const matchFilter =
      filter === "all" ||
      (filter === "upcoming" && (isFuture(d) || isToday(d))) ||
      (filter === "past" && isPast(d) && !isToday(d));
    return matchSearch && matchFilter;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProjectId || !formDate || !formNotes) return;
    createVisit.mutate(
      { projectId: Number(formProjectId), data: { visitDate: formDate, notes: formNotes, progressStatus: formProgress || undefined, detectedIssues: formIssues || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
          setIsOpen(false);
          setFormProjectId(""); setFormDate(new Date().toISOString().split("T")[0]);
          setFormProgress(""); setFormNotes(""); setFormIssues("");
          toast({ title: "Visit scheduled successfully" });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteVisit.mutate(
      { id: deleteTarget.id, projectId: deleteTarget.projectId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
          setDeleteTarget(null);
          toast({ title: "Visit deleted" });
        },
      }
    );
  };

  const upcomingCount = (visits ?? []).filter(v => isFuture(new Date(v.visitDate)) || isToday(new Date(v.visitDate))).length;
  const pastCount = (visits ?? []).filter(v => isPast(new Date(v.visitDate)) && !isToday(new Date(v.visitDate))).length;

  return (
    <ProtectedLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
            Site Visits
          </h1>
          <p className="text-muted-foreground">All visits across all your projects — scheduled and past.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-md"><Plus className="w-5 h-5 mr-2" /> Schedule Visit</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader><DialogTitle>Schedule a Site Visit</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Project *</label>
                <select
                  value={formProjectId}
                  onChange={e => setFormProjectId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="">Select a project…</option>
                  {projects?.map(p => (
                    <option key={p.id} value={p.id}>{p.name} — {p.client}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Visit Date *</label>
                <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Progress Status</label>
                <Input value={formProgress} onChange={e => setFormProgress(e.target.value)} placeholder="e.g. Foundation completed" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Notes *</label>
                <textarea
                  value={formNotes} onChange={e => setFormNotes(e.target.value)}
                  required placeholder="Observations, tasks, action items…"
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Detected Issues</label>
                <textarea
                  value={formIssues} onChange={e => setFormIssues(e.target.value)}
                  placeholder="Any problems or risks found on-site…"
                  className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <Button type="submit" className="w-full" disabled={createVisit.isPending || !formProjectId || !formNotes}>
                {createVisit.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Schedule Visit
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total", value: visits?.length ?? "–", icon: Calendar, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Upcoming", value: upcomingCount, icon: CalendarClock, color: "text-violet-500", bg: "bg-violet-500/10" },
          { label: "Completed", value: pastCount, icon: CalendarCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        ].map((s, i) => (
          <div key={i} className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.bg} shrink-0`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
            <div>
              <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{isLoading ? "–" : s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search visits…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {(["all", "upcoming", "past"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                filter === f ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Delete Visit?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This visit will be permanently removed.</p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={deleteVisit.isPending}>
              {deleteVisit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border/50">
          <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
          <h3 className="text-xl font-bold mb-2">No visits found</h3>
          <p className="text-muted-foreground text-sm">Schedule a visit from a project or use the button above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(v => {
            const d = new Date(v.visitDate);
            const isUpcoming = isFuture(d) || isToday(d);
            const todayFlag = isToday(d);
            return (
              <div
                key={v.id}
                className={`group bg-card rounded-2xl border shadow-sm hover:shadow-md transition-all flex items-start gap-4 p-5 ${
                  todayFlag ? "border-red-300/60 bg-red-50/30 dark:bg-red-950/10" :
                  isUpcoming ? "border-violet-200/60 bg-violet-50/20 dark:bg-violet-950/10" :
                  "border-border/50"
                }`}
              >
                {/* Date badge */}
                <div className={`shrink-0 text-center rounded-xl p-3 min-w-[60px] ${
                  todayFlag ? "bg-red-500 text-white" :
                  isUpcoming ? "bg-violet-500/10 text-violet-600" :
                  "bg-muted text-muted-foreground"
                }`}>
                  <p className="text-xs font-semibold uppercase">{format(d, "MMM")}</p>
                  <p className="text-2xl font-bold leading-none">{format(d, "d")}</p>
                  <p className="text-xs">{format(d, "yyyy")}</p>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Project link */}
                  <Link href={`/projects/${v.projectId}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mb-1">
                    <Building className="w-3 h-3" /> {v.projectName}
                    <ChevronRight className="w-3 h-3" />
                  </Link>

                  {v.progressStatus && (
                    <h3 className="font-semibold text-foreground">{v.progressStatus}</h3>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{v.notes}</p>

                  {v.detectedIssues && (
                    <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full">
                      <FileWarning className="w-3.5 h-3.5" /> {v.detectedIssues.slice(0, 60)}{v.detectedIssues.length > 60 ? "…" : ""}
                    </div>
                  )}

                  {v.projectAddress && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                      <MapPin className="w-3 h-3 shrink-0" />{v.projectAddress}
                    </p>
                  )}
                </div>

                {/* Status pill + delete */}
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                    todayFlag ? "bg-red-500/10 text-red-600 border-red-300/50" :
                    isUpcoming ? "bg-violet-500/10 text-violet-600 border-violet-300/50" :
                    "bg-muted text-muted-foreground border-border/50"
                  }`}>
                    {todayFlag ? "Today" : isUpcoming ? "Upcoming" : "Past"}
                  </span>
                  <button
                    onClick={() => setDeleteTarget({ id: v.id, projectId: v.projectId })}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ProtectedLayout>
  );
}
