import { useState } from "react";
import { useRoute } from "wouter";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useProject, useUpdateProject } from "@/hooks/use-projects";
import { useVisits, useCreateVisit } from "@/hooks/use-visits";
import { useDocuments, useCreateDocument } from "@/hooks/use-documents";
import { ProjectMap } from "@/components/map/ProjectMap";
import { Building, Calendar, FileText, MapPin, DollarSign, Loader2, Plus, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const projectId = Number(params?.id);
  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'documents'>('overview');

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: visits, isLoading: visitsLoading } = useVisits(projectId);
  const { data: documents, isLoading: documentsLoading } = useDocuments(projectId);

  if (projectLoading) return <ProtectedLayout><div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div></ProtectedLayout>;
  if (!project) return <ProtectedLayout><div className="p-20 text-center text-xl">Project not found</div></ProtectedLayout>;

  return (
    <ProtectedLayout>
      <Link href="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
      </Link>

      {/* Header Card */}
      <div className="bg-card rounded-3xl p-6 lg:p-8 border border-border/50 shadow-md mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                project.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 
                project.status === 'completed' ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'
              }`}>
                {project.status}
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-foreground mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              {project.name}
            </h1>
            <p className="text-lg text-muted-foreground flex items-center gap-2">
              <Building className="w-5 h-5" /> {project.client}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4 bg-background/50 p-4 rounded-2xl border border-border/50">
            <div className="flex items-center gap-3 pr-4 border-r border-border">
              <div className="bg-primary/10 p-2 rounded-lg text-primary"><MapPin className="w-5 h-5"/></div>
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm font-medium">{project.latitude}, {project.longitude}</p>
              </div>
            </div>
            {project.budget && (
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-600"><DollarSign className="w-5 h-5"/></div>
                <div>
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p className="text-sm font-medium">${Number(project.budget).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/50 mb-8 overflow-x-auto hide-scrollbar">
        {[
          { id: 'overview', label: 'Overview & Map', icon: MapPin },
          { id: 'visits', label: `Site Visits (${visits?.length || 0})`, icon: Calendar },
          { id: 'documents', label: `Documents (${documents?.length || 0})`, icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-all whitespace-nowrap border-b-2 ${
              activeTab === tab.id 
                ? "border-primary text-primary bg-primary/5" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            <tab.icon className="w-5 h-5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm h-full">
                <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Location</h3>
                <ProjectMap projects={[project]} height="400px" />
              </div>
            </div>
            <div className="space-y-8">
              <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
                <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Details</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {project.description || "No description provided for this project."}
                </p>
                <div className="mt-6 pt-6 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">Created on {format(new Date(project.createdAt!), "MMMM d, yyyy")}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'visits' && (
          <VisitTab projectId={projectId} visits={visits || []} isLoading={visitsLoading} />
        )}

        {activeTab === 'documents' && (
          <DocumentTab projectId={projectId} documents={documents || []} isLoading={documentsLoading} />
        )}
      </div>
    </ProtectedLayout>
  );
}

function VisitTab({ projectId, visits, isLoading }: { projectId: number, visits: any[], isLoading: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const createVisit = useCreateVisit();
  
  const formSchema = z.object({
    visitDate: z.string(),
    notes: z.string().min(1),
    progressStatus: z.string().optional(),
  });

  const { register, handleSubmit, reset } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { visitDate: new Date().toISOString().split('T')[0] }
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createVisit.mutate({ projectId, data: { ...data, visitDate: new Date(data.visitDate) } }, {
      onSuccess: () => { setIsOpen(false); reset(); }
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Site Visits</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Log Visit</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log New Site Visit</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Date</label>
                <Input type="date" {...register("visitDate")} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Progress Status</label>
                <Input {...register("progressStatus")} placeholder="e.g. Foundation completed" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Notes</label>
                <textarea {...register("notes")} className="w-full flex min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Observation notes..."></textarea>
              </div>
              <Button type="submit" className="w-full" disabled={createVisit.isPending}>
                {createVisit.isPending ? "Saving..." : "Save Visit"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div> :
       visits.length === 0 ? <div className="text-center py-12 bg-card rounded-2xl border border-border/50 text-muted-foreground">No visits logged yet.</div> :
       <div className="relative border-l-2 border-primary/20 ml-4 space-y-8 pb-4">
         {visits.sort((a,b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()).map((visit) => (
           <div key={visit.id} className="relative pl-8">
             <div className="absolute w-4 h-4 bg-primary rounded-full -left-[9px] top-1 shadow-md border-2 border-background"></div>
             <div className="bg-card p-5 rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
               <span className="text-sm font-bold text-primary mb-2 block">{format(new Date(visit.visitDate), "MMMM d, yyyy")}</span>
               {visit.progressStatus && <h4 className="font-semibold text-lg mb-2">{visit.progressStatus}</h4>}
               <p className="text-muted-foreground whitespace-pre-wrap">{visit.notes}</p>
             </div>
           </div>
         ))}
       </div>
      }
    </div>
  );
}

function DocumentTab({ projectId, documents, isLoading }: { projectId: number, documents: any[], isLoading: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const createDoc = useCreateDocument();
  
  const formSchema = z.object({
    name: z.string().min(1),
    type: z.string(),
    fileUrl: z.string().url(),
  });

  const { register, handleSubmit, reset } = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema), defaultValues: { type: 'pdf' } });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createDoc.mutate({ projectId, data }, { onSuccess: () => { setIsOpen(false); reset(); }});
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Documents</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Document</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Document Link</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Document Name</label>
                <Input {...register("name")} placeholder="Site Plan v2" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <select {...register("type")} className="w-full flex h-10 items-center rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="pdf">PDF</option>
                  <option value="plan">Plan / Blueprint</option>
                  <option value="contract">Contract</option>
                  <option value="image">Image</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">File URL (Mock)</label>
                <Input {...register("fileUrl")} placeholder="https://example.com/file.pdf" />
              </div>
              <Button type="submit" className="w-full" disabled={createDoc.isPending}>Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div> :
       documents.length === 0 ? <div className="text-center py-12 bg-card rounded-2xl border border-border/50 text-muted-foreground">No documents added.</div> :
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {documents.map((doc) => (
           <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-card p-4 rounded-2xl border border-border/50 shadow-sm hover:border-primary/50 hover:shadow-md transition-all group">
             <div className="bg-primary/10 p-4 rounded-xl text-primary group-hover:scale-110 transition-transform">
               <FileText className="w-8 h-8" />
             </div>
             <div className="overflow-hidden">
               <h4 className="font-semibold truncate text-foreground group-hover:text-primary transition-colors">{doc.name}</h4>
               <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{doc.type}</p>
             </div>
           </a>
         ))}
       </div>
      }
    </div>
  );
}
