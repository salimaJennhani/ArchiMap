import { useState } from "react";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useProjects, useCreateProject, useDeleteProject } from "@/hooks/use-projects";
import { Link } from "wouter";
import { Plus, Building, Search, Loader2, AlertTriangle, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertProjectSchema } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { LocationSearch } from "@/components/location/LocationSearch";

const formSchema = insertProjectSchema.extend({
  latitude: z.union([z.string(), z.number()]).transform(v => Number(v)).pipe(z.number().min(-90).max(90)),
  longitude: z.union([z.string(), z.number()]).transform(v => Number(v)).pipe(z.number().min(-180).max(180)),
  budget: z.union([z.string(), z.number()]).optional().transform(v => (v !== "" && v !== undefined ? Number(v) : undefined)),
  description: z.string().optional(),
  address: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

export default function ProjectList() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const { toast } = useToast();

  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { status: "planned" },
  });

  const onSubmit = (data: FormValues) => {
    createProject.mutate(data, {
      onSuccess: () => {
        setIsDialogOpen(false);
        reset();
      },
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteProject.mutateAsync(deleteId);
    toast({ title: "Project deleted" });
    setDeleteId(null);
  };

  const getStatusColor = (s: string) => ({
    active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    completed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  }[s] ?? "bg-amber-500/10 text-amber-600 border-amber-500/20");

  const filtered = projects?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.client.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ProtectedLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>Projects</h1>
          <p className="text-muted-foreground">Manage your construction sites and client portfolios.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={v => { setIsDialogOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            <Button className="shadow-md"><Plus className="w-5 h-5 mr-2" /> New Project</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[580px] max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>Create New Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Project Name *</label>
                  <Input {...register("name")} placeholder="e.g. Downtown Highrise" />
                  {errors.name && <p className="text-xs text-red-500">{String(errors.name.message)}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Client *</label>
                  <Input {...register("client")} placeholder="e.g. Acme Corp" />
                  {errors.client && <p className="text-xs text-red-500">{String(errors.client.message)}</p>}
                </div>
              </div>

              {/* Location search — the key feature */}
              <LocationSearch
                onSelect={({ lat, lng, address }) => {
                  setValue("latitude", lat as any);
                  setValue("longitude", lng as any);
                  setValue("address", address);
                }}
              />

              {/* Manual lat/lng override */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Or enter coordinates manually:</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Latitude</label>
                    <Input type="number" step="0.0001" {...register("latitude")} placeholder="36.8190" />
                    {errors.latitude && <p className="text-xs text-red-500">{String(errors.latitude?.message)}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Longitude</label>
                    <Input type="number" step="0.0001" {...register("longitude")} placeholder="10.1658" />
                    {errors.longitude && <p className="text-xs text-red-500">{String(errors.longitude?.message)}</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Budget ($)</label>
                <Input type="number" step="0.01" {...register("budget")} placeholder="500000" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  {...register("description")}
                  placeholder="Project scope, key milestones, notes…"
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Status</label>
                <select {...register("status")} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <Button type="submit" className="w-full" disabled={createProject.isPending}>
                {createProject.isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Create Project"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete confirm */}
      <Dialog open={deleteId !== null} onOpenChange={v => !v && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Delete Project?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete <strong>{deleteName}</strong> along with all its visits and documents.</p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={deleteProject.isPending}>
              {deleteProject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search */}
      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          className="pl-10 h-12 rounded-xl bg-card border-border/50 shadow-sm"
          placeholder="Search projects or clients…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border/50">
          <Building className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2">No projects found</h3>
          <p className="text-muted-foreground">Create your first project to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered?.map(project => (
            <div key={project.id} className="group bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 flex flex-col relative overflow-hidden">
              <button
                onClick={e => { e.stopPropagation(); setDeleteId(project.id); setDeleteName(project.name); }}
                className="absolute top-4 right-4 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 bg-background/80 hover:bg-destructive hover:text-white text-muted-foreground transition-all z-10 shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <Link href={`/projects/${project.id}`} className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4 pr-8">
                  <div className="bg-primary/5 p-3 rounded-xl group-hover:bg-primary/10 transition-colors">
                    <Building className="w-6 h-6 text-primary" />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: "var(--font-display)" }}>
                  {project.name}
                </h3>
                <p className="text-muted-foreground text-sm flex items-center gap-1.5 mb-1">
                  <Building className="w-4 h-4 shrink-0" /> {project.client}
                </p>
                {project.address && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2 truncate">
                    <MapPin className="w-3 h-3 shrink-0" /> {project.address}
                  </p>
                )}
                {project.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">{project.description}</p>
                )}
                <div className="mt-auto pt-4 border-t border-border/50 flex justify-between items-center text-sm text-muted-foreground">
                  <span className="text-xs">{format(new Date(project.createdAt!), "MMM yyyy")}</span>
                  {project.budget && <span className="font-medium text-foreground">${Number(project.budget).toLocaleString()}</span>}
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </ProtectedLayout>
  );
}
