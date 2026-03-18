import { useState, useRef } from "react";
import { useRoute } from "wouter";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useProject } from "@/hooks/use-projects";
import { useVisits, useCreateVisit } from "@/hooks/use-visits";
import { useDocuments, useCreateDocument } from "@/hooks/use-documents";
import { ProjectMap } from "@/components/map/ProjectMap";
import {
  Building, Calendar, FileText, MapPin, DollarSign,
  Loader2, Plus, ArrowLeft, Upload, File, ImageIcon, FileWarning
} from "lucide-react";
import { format, isFuture, isToday } from "date-fns";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const projectId = Number(params?.id);
  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'documents'>('overview');

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: visits, isLoading: visitsLoading } = useVisits(projectId);
  const { data: documents, isLoading: documentsLoading } = useDocuments(projectId);

  if (projectLoading) return <ProtectedLayout><div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div></ProtectedLayout>;
  if (!project) return <ProtectedLayout><div className="p-20 text-center text-xl">Project not found</div></ProtectedLayout>;

  const upcomingVisits = visits?.filter(v => isFuture(new Date(v.visitDate)) || isToday(new Date(v.visitDate))) ?? [];
  const pastVisits = visits?.filter(v => !isFuture(new Date(v.visitDate)) && !isToday(new Date(v.visitDate))) ?? [];

  return (
    <ProtectedLayout>
      <Link href="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
      </Link>

      {/* Header Card */}
      <div className="bg-card rounded-3xl p-6 lg:p-8 border border-border/50 shadow-md mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                project.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' :
                project.status === 'completed' ? 'bg-blue-500/10 text-blue-600' :
                'bg-amber-500/10 text-amber-600'
              }`}>
                {project.status}
              </span>
              {upcomingVisits.length > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-500/10 text-violet-600 uppercase tracking-wider">
                  {upcomingVisits.length} upcoming visit{upcomingVisits.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-foreground mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              {project.name}
            </h1>
            <p className="text-lg text-muted-foreground flex items-center gap-2 mb-3">
              <Building className="w-5 h-5" /> {project.client}
            </p>
            {project.description && (
              <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">{project.description}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-4 bg-background/50 p-4 rounded-2xl border border-border/50 shrink-0">
            <div className="flex items-center gap-3 pr-4 border-r border-border">
              <div className="bg-primary/10 p-2 rounded-lg text-primary"><MapPin className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Coordinates</p>
                <p className="text-sm font-medium font-mono">
                  {parseFloat(String(project.latitude)).toFixed(4)}, {parseFloat(String(project.longitude)).toFixed(4)}
                </p>
              </div>
            </div>
            {project.budget && (
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-600"><DollarSign className="w-5 h-5" /></div>
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
      <div className="flex border-b border-border/50 mb-8 overflow-x-auto">
        {[
          { id: 'overview', label: 'Map & Overview', icon: MapPin },
          { id: 'visits', label: `Visits (${visits?.length || 0})`, icon: Calendar },
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

      <div>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
                <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Site Location</h3>
                <ProjectMap projects={[project]} height="420px" />
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
                <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'var(--font-display)' }}>Details</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {project.description || "No description provided for this project."}
                </p>
                <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground space-y-1">
                  <p>Created: {format(new Date(project.createdAt!), "MMMM d, yyyy")}</p>
                </div>
              </div>

              {upcomingVisits.length > 0 && (
                <div className="bg-violet-50 dark:bg-violet-950/20 rounded-2xl p-5 border border-violet-200/50 dark:border-violet-800/30">
                  <h3 className="text-sm font-bold text-violet-700 dark:text-violet-400 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Upcoming Visits
                  </h3>
                  <div className="space-y-2">
                    {upcomingVisits.slice(0, 3).map(v => (
                      <div key={v.id} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{format(new Date(v.visitDate), "MMM d, yyyy")}</span>
                        {v.progressStatus && <span className="text-xs text-muted-foreground truncate ml-2">{v.progressStatus}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

function VisitTab({ projectId, visits, isLoading }: { projectId: number; visits: any[]; isLoading: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const createVisit = useCreateVisit();
  const today = new Date().toISOString().split('T')[0];

  const formSchema = z.object({
    visitDate: z.string().min(1, "Date required").refine(
      d => new Date(d) >= new Date(new Date().setHours(0, 0, 0, 0)),
      "Visit date must be today or in the future"
    ),
    notes: z.string().min(1, "Notes are required"),
    progressStatus: z.string().optional(),
    detectedIssues: z.string().optional(),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { visitDate: today }
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createVisit.mutate(
      { projectId, data: { ...data, visitDate: new Date(data.visitDate) } },
      { onSuccess: () => { setIsOpen(false); reset({ visitDate: today }); } }
    );
  };

  const upcoming = visits.filter(v => isFuture(new Date(v.visitDate)) || isToday(new Date(v.visitDate)));
  const past = visits.filter(v => !isFuture(new Date(v.visitDate)) && !isToday(new Date(v.visitDate)));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Site Visits</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Schedule / Log Visit</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Site Visit</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Visit Date <span className="text-muted-foreground">(today or future)</span></label>
                <Input type="date" {...register("visitDate")} min={today} />
                {errors.visitDate && <p className="text-xs text-red-500 mt-1">{String(errors.visitDate.message)}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Progress Status</label>
                <Input {...register("progressStatus")} placeholder="e.g. Foundation completed" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Notes *</label>
                <textarea
                  {...register("notes")}
                  className="w-full min-h-[90px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Observations, tasks completed, issues noted..."
                />
                {errors.notes && <p className="text-xs text-red-500 mt-1">{String(errors.notes.message)}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Detected Issues</label>
                <textarea
                  {...register("detectedIssues")}
                  className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Any problems or risks to flag..."
                />
              </div>
              <Button type="submit" className="w-full" disabled={createVisit.isPending}>
                {createVisit.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : "Save Visit"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
      ) : visits.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border/50 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No visits yet. Schedule the first one!</p>
        </div>
      ) : (
        <div className="space-y-10">
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Upcoming
              </h3>
              <div className="space-y-3">
                {upcoming.sort((a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime()).map(visit => (
                  <div key={visit.id} className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-700/30 rounded-2xl p-5">
                    <span className="text-sm font-bold text-violet-700 dark:text-violet-400 block mb-1">
                      {isToday(new Date(visit.visitDate)) ? "Today" : format(new Date(visit.visitDate), "EEEE, MMMM d, yyyy")}
                    </span>
                    {visit.progressStatus && <h4 className="font-semibold mb-1">{visit.progressStatus}</h4>}
                    <p className="text-sm text-muted-foreground">{visit.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Past Visits</h3>
              <div className="relative border-l-2 border-primary/20 ml-4 space-y-6 pb-4">
                {past.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()).map(visit => (
                  <div key={visit.id} className="relative pl-8">
                    <div className="absolute w-4 h-4 bg-primary rounded-full -left-[9px] top-1 shadow-md border-2 border-background" />
                    <div className="bg-card p-5 rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                      <span className="text-sm font-bold text-primary mb-1 block">{format(new Date(visit.visitDate), "MMMM d, yyyy")}</span>
                      {visit.progressStatus && <h4 className="font-semibold text-base mb-2">{visit.progressStatus}</h4>}
                      <p className="text-muted-foreground text-sm whitespace-pre-wrap">{visit.notes}</p>
                      {visit.detectedIssues && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <p className="text-xs font-semibold text-amber-600 flex items-center gap-1 mb-1">
                            <FileWarning className="w-3.5 h-3.5" /> Issues Detected
                          </p>
                          <p className="text-sm text-muted-foreground">{visit.detectedIssues}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DocumentTab({ projectId, documents, isLoading }: { projectId: number; documents: any[]; isLoading: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const createDoc = useCreateDocument();
  const { toast } = useToast();

  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("pdf");

  const handleFile = (file: File) => {
    setSelectedFile(file);
    if (!docName) setDocName(file.name.replace(/\.[^.]+$/, ""));
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") setDocType("pdf");
    else if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext || "")) setDocType("image");
    else if (["dwg", "dxf", "svg"].includes(ext || "")) setDocType("plan");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url } = await uploadRes.json();

      createDoc.mutate(
        { projectId, data: { name: docName || selectedFile.name, type: docType, fileUrl: url } },
        {
          onSuccess: () => {
            setIsOpen(false);
            setSelectedFile(null);
            setDocName("");
            setDocType("pdf");
            toast({ title: "Document uploaded successfully" });
          }
        }
      );
    } catch {
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type === "image") return <ImageIcon className="w-8 h-8" />;
    if (type === "plan") return <FileText className="w-8 h-8" />;
    return <File className="w-8 h-8" />;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Documents</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Upload Document</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              {/* Drag & drop zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                {selectedFile ? (
                  <div>
                    <p className="font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium">Drop a file here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG, DWG, SVG supported</p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.dwg,.dxf,.svg"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Document Name</label>
                <Input value={docName} onChange={e => setDocName(e.target.value)} placeholder="e.g. Site Plan v2" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="pdf">PDF Document</option>
                  <option value="plan">Plan / Blueprint</option>
                  <option value="contract">Contract</option>
                  <option value="image">Photo / Image</option>
                </select>
              </div>

              <Button type="submit" className="w-full" disabled={!selectedFile || uploading || createDoc.isPending}>
                {uploading || createDoc.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Uploading...</>
                  : <><Upload className="w-4 h-4 mr-2" />Upload</>
                }
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
          <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="font-medium text-muted-foreground">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <a
              key={doc.id}
              href={doc.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-4 bg-card p-4 rounded-2xl border border-border/50 shadow-sm hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <div className="bg-primary/10 p-4 rounded-xl text-primary group-hover:scale-110 transition-transform shrink-0">
                {getFileIcon(doc.type)}
              </div>
              <div className="overflow-hidden flex-1">
                <h4 className="font-semibold truncate text-foreground group-hover:text-primary transition-colors">{doc.name}</h4>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">{doc.type}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(doc.uploadDate!), "MMM d, yyyy")}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
