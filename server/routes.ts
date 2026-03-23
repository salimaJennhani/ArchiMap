import type { Express } from "express";
import type { Server } from "http";
import path from "path";
import fs from "fs";
import multer from "multer";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/pdf|png|jpg|jpeg|webp|gif|svg|dwg|dxf/i.test(path.extname(file.originalname)))
      cb(null, true);
    else cb(new Error("File type not allowed"));
  },
});

const numStr = z.union([z.string(), z.number()]).transform(v => String(v));
const numStrOpt = z.union([z.string(), z.number()]).optional().transform(v => (v !== undefined && v !== "" ? String(v) : undefined));

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
  const auth = isAuthenticated;

  // Serve uploaded files
  app.get("/uploads/:filename", (req, res) => {
    const filePath = path.join(uploadsDir, path.basename(req.params.filename));
    res.sendFile(filePath, (err) => { if (err) res.status(404).json({ message: "File not found" }); });
  });

  // File upload
  app.post("/api/upload", auth, upload.single("file"), (req: any, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.originalname, size: req.file.size });
  });

  // ─── Projects ───────────────────────────────────────────────────────────────
  app.get(api.projects.list.path, auth, async (req: any, res) => {
    res.json(await storage.getProjects(req.user.claims.sub));
  });

  app.get(api.projects.get.path, auth, async (req: any, res) => {
    const item = await storage.getProject(Number(req.params.id), req.user.claims.sub);
    if (!item) return res.status(404).json({ message: "Project not found" });
    res.json(item);
  });

  app.post(api.projects.create.path, auth, async (req: any, res) => {
    try {
      const bodySchema = api.projects.create.input.extend({
        latitude: numStr, longitude: numStr, budget: numStrOpt,
      });
      const input = bodySchema.parse(req.body);
      res.status(201).json(await storage.createProject(req.user.claims.sub, input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      throw err;
    }
  });

  app.put(api.projects.update.path, auth, async (req: any, res) => {
    try {
      const bodySchema = api.projects.update.input.extend({
        latitude: numStr.optional(), longitude: numStr.optional(), budget: numStrOpt,
      });
      const input = bodySchema.parse(req.body);
      const item = await storage.updateProject(Number(req.params.id), req.user.claims.sub, input);
      if (!item) return res.status(404).json({ message: "Project not found" });
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      throw err;
    }
  });

  app.delete(api.projects.delete.path, auth, async (req: any, res) => {
    await storage.deleteProject(Number(req.params.id), req.user.claims.sub);
    res.status(204).send();
  });

  // ─── Visits ─────────────────────────────────────────────────────────────────
  app.get("/api/visits/upcoming", auth, async (req: any, res) => {
    res.json(await storage.getUpcomingVisits(req.user.claims.sub));
  });

  app.get(api.visits.list.path, auth, async (req: any, res) => {
    const project = await storage.getProject(Number(req.params.projectId), req.user.claims.sub);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(await storage.getVisits(project.id));
  });

  app.post(api.visits.create.path, auth, async (req: any, res) => {
    try {
      const project = await storage.getProject(Number(req.params.projectId), req.user.claims.sub);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const input = api.visits.create.input.parse(req.body);
      res.status(201).json(await storage.createVisit(project.id, input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.put("/api/visits/:id", auth, async (req: any, res) => {
    try {
      const { visitDate, notes, progressStatus, detectedIssues } = req.body;
      const updated = await storage.updateVisit(Number(req.params.id), { visitDate, notes, progressStatus, detectedIssues });
      if (!updated) return res.status(404).json({ message: "Visit not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.delete("/api/visits/:id", auth, async (_req, res) => {
    await storage.deleteVisit(Number(_req.params.id));
    res.status(204).send();
  });

  // ─── Documents ──────────────────────────────────────────────────────────────
  app.get(api.documents.list.path, auth, async (req: any, res) => {
    const project = await storage.getProject(Number(req.params.projectId), req.user.claims.sub);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(await storage.getDocuments(project.id));
  });

  app.post(api.documents.create.path, auth, async (req: any, res) => {
    try {
      const project = await storage.getProject(Number(req.params.projectId), req.user.claims.sub);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const input = api.documents.create.input.parse(req.body);
      res.status(201).json(await storage.createDocument(project.id, input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.delete("/api/documents/:id", auth, async (req, res) => {
    await storage.deleteDocument(Number(req.params.id));
    res.status(204).send();
  });

  // ─── Dashboard ──────────────────────────────────────────────────────────────
  app.get(api.dashboard.stats.path, auth, async (req: any, res) => {
    res.json(await storage.getDashboardStats(req.user.claims.sub));
  });

  return httpServer;
}
