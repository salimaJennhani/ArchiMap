import { useState } from "react";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useProjects, useCreateProject } from "@/hooks/use-projects";
import { Link } from "wouter";
import { Plus, MapPin, Building, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertProjectSchema } from "@shared/routes";

const formSchema = insertProjectSchema.extend({
  latitude: z.union([z.string(), z.number()]).transform(v => Number(v)).pipe(z.number().min(-90).max(90)),
  longitude: z.union([z.string(), z.number()]).transform(v => Number(v)).pipe(z.number().min(-180).max(180)),
  budget: z.union([z.string(), z.number()]).optional().transform(v => v ? Number(v) : undefined),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ProjectList() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "planned"
    }
  });

  const onSubmit = (data: FormValues) => {
    createProject.mutate(data, {
      onSuccess: () => {
        setIsDialogOpen(false);
        reset();
      }
    });
  };

  const filteredProjects = projects?.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.client.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default: return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    }
  };

  return (
    <ProtectedLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-display)' }}>Projects</h1>
          <p className="text-muted-foreground">Manage your construction sites and client portfolios.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
              <Plus className="w-5 h-5 mr-2" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-2xl" style={{ fontFamily: 'var(--font-display)' }}>Create New Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Project Name</label>
                <Input {...register("name")} placeholder="e.g. Downtown Highrise" />
                {errors.name && <p className="text-xs text-red-500">{String(errors.name?.message)}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Client</label>
                <Input {...register("client")} placeholder="e.g. Acme Corp" />
                {errors.client && <p className="text-xs text-red-500">{String(errors.client?.message)}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Latitude</label>
                  <Input type="number" step="0.0001" {...register("latitude")} placeholder="34.0522" />
                  {errors.latitude && <p className="text-xs text-red-500">{String(errors.latitude?.message)}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Longitude</label>
                  <Input type="number" step="0.0001" {...register("longitude")} placeholder="-118.2437" />
                  {errors.longitude && <p className="text-xs text-red-500">{String(errors.longitude?.message)}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Budget ($)</label>
                <Input type="number" step="0.01" {...register("budget")} placeholder="500000" />
                {errors.budget && <p className="text-xs text-red-500">{String(errors.budget?.message)}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea {...register("description")} placeholder="Project details, scope, and notes..." className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select {...register("status")} className="w-full flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <Button type="submit" className="w-full mt-6" disabled={createProject.isPending}>
                {createProject.isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Create Project"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input 
          className="pl-10 h-12 rounded-xl bg-card border-border/50 shadow-sm" 
          placeholder="Search projects or clients..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
      ) : filteredProjects?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border/50">
          <Building className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2">No projects found</h3>
          <p className="text-muted-foreground">Create your first project to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects?.map(project => (
            <Link key={project.id} href={`/projects/${project.id}`} className="group block">
              <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 h-full flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-primary/5 p-3 rounded-xl group-hover:bg-primary/10 transition-colors">
                    <Building className="w-6 h-6 text-primary" />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: 'var(--font-display)' }}>
                  {project.name}
                </h3>
                <p className="text-muted-foreground text-sm flex items-center gap-1.5 mb-6">
                  <MapPin className="w-4 h-4" /> {project.client}
                </p>
                
                <div className="mt-auto pt-4 border-t border-border/50 flex justify-between items-center text-sm text-muted-foreground">
                  <span>Created {format(new Date(project.createdAt!), "MMM yyyy")}</span>
                  {project.budget && <span className="font-medium text-foreground">${Number(project.budget).toLocaleString()}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </ProtectedLayout>
  );
}
