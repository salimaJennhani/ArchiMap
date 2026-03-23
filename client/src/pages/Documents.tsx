import { useState, useRef } from "react";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProjects } from "@/hooks/use-projects";
import { useCreateDocument, useDeleteDocument } from "@/hooks/use-documents";
import { Link } from "wouter";
import {
  FileText, Loader2, Plus, Search, Building, File,
  ImageIcon, AlertTriangle, Trash2, Upload, ChevronRight, FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { DocumentWithProject } from "@shared/schema";

function useAllDocuments() {
  return useQuery<DocumentWithProject[]>({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      const res = await fetch("/api/documents", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
  });
}

const DOC_TYPES = ["pdf", "plan", "contract", "image"] as const;

function docIcon(type: string) {
  if (type === "image") return <ImageIcon className="w-6 h-6" />;
  return <File className="w-6 h-6" />;
}

function docColor(type: string) {
  const map: Record<string, string> = {
    pdf: "bg-red-500/10 text-red-600",
    plan: "bg-blue-500/10 text-blue-600",
    contract: "bg-emerald-500/10 text-emerald-600",
    image: "bg-violet-500/10 text-violet-600",
  };
  return map[type] ?? "bg-muted text-muted-foreground";
}

export default function DocumentsPage() {
  const { data: docs, isLoading } = useAllDocuments();
  const { data: projects } = useProjects();
  const createDoc = useCreateDocument();
  const deleteDoc = useDeleteDocument();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isOpen, setIsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; projectId: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Upload form state
  const [formProjectId, setFormProjectId] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("pdf");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFile = (file: File) => {
    setSelectedFile(file);
    if (!formName) setFormName(file.name.replace(/\.[^.]+$/, ""));
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") setFormType("pdf");
    else if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext || "")) setFormType("image");
    else if (["dwg", "dxf", "svg"].includes(ext || "")) setFormType("plan");
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !formProjectId) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: form, credentials: "include" });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url } = await uploadRes.json();
      createDoc.mutate(
        { projectId: Number(formProjectId), data: { name: formName || selectedFile.name, type: formType, fileUrl: url } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
            setIsOpen(false);
            setSelectedFile(null); setFormProjectId(""); setFormName(""); setFormType("pdf");
            toast({ title: "Document uploaded" });
          },
        }
      );
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setUploading(false); }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteDoc.mutate(
      { id: deleteTarget.id, projectId: deleteTarget.projectId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
          setDeleteTarget(null);
          toast({ title: "Document deleted" });
        },
      }
    );
  };

  const filtered = (docs ?? []).filter(d => {
    const matchSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.projectName.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || d.type === typeFilter;
    return matchSearch && matchType;
  });

  const typeCounts = DOC_TYPES.reduce((acc, t) => {
    acc[t] = (docs ?? []).filter(d => d.type === t).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <ProtectedLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
            Documents
          </h1>
          <p className="text-muted-foreground">All files and plans across all your projects.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-md"><Plus className="w-5 h-5 mr-2" /> Upload Document</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4 pt-2">
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
              {/* Dropzone */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                {selectedFile ? (
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium">Drop a file or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG, DWG, SVG up to 20MB</p>
                  </div>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.dwg,.dxf,.svg" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Name</label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Site Plan v2" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Type</label>
                <select value={formType} onChange={e => setFormType(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="pdf">PDF Document</option>
                  <option value="plan">Plan / Blueprint</option>
                  <option value="contract">Contract</option>
                  <option value="image">Photo / Image</option>
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={!selectedFile || !formProjectId || uploading || createDoc.isPending}>
                {uploading || createDoc.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Uploading…</> : <><Upload className="w-4 h-4 mr-2" />Upload</>}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Type filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setTypeFilter("all")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${typeFilter === "all" ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border/50 text-muted-foreground hover:text-foreground"}`}
        >
          All ({docs?.length ?? 0})
        </button>
        {DOC_TYPES.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${typeFilter === t ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border/50 text-muted-foreground hover:text-foreground"}`}
          >
            {t} ({typeCounts[t] ?? 0})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search documents or projects…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Delete Document?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This file will be permanently removed.</p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={deleteDoc.isPending}>
              {deleteDoc.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border/50">
          <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
          <h3 className="text-xl font-bold mb-2">No documents found</h3>
          <p className="text-muted-foreground text-sm">Upload documents from a project or use the button above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(doc => (
            <div key={doc.id} className="group bg-card rounded-2xl border border-border/50 shadow-sm hover:border-primary/40 hover:shadow-md transition-all relative">
              <button
                onClick={() => setDeleteTarget({ id: doc.id, projectId: doc.projectId })}
                className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all z-10"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="p-5 flex items-start gap-4 block">
                <div className={`p-3.5 rounded-xl shrink-0 ${docColor(doc.type)}`}>
                  {docIcon(doc.type)}
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <h3 className="font-semibold text-foreground truncate hover:text-primary transition-colors">{doc.name}</h3>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-0.5">{doc.type}</p>
                  <Link href={`/projects/${doc.projectId}`} onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2">
                    <Building className="w-3 h-3" /> {doc.projectName}
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(doc.uploadDate!), "MMM d, yyyy")}</p>
                </div>
              </a>
            </div>
          ))}
        </div>
      )}
    </ProtectedLayout>
  );
}
