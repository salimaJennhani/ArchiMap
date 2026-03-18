import type { Express } from "express";
import type { Server } from "http";
import path from "path";
import fs from "fs";
import multer from "multer";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${unique}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /pdf|png|jpg|jpeg|webp|gif|svg|dwg|dxf/i;
    if (allowed.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error("File type not allowed"));
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  const requireAuth = isAuthenticated;

  // Serve uploaded files
  app.use("/uploads", (req, res, next) => {
    // Security: prevent path traversal
    const filePath = path.join(uploadsDir, path.basename(req.path));
    res.sendFile(filePath, { root: "/" }, (err) => {
      if (err) next();
    });
  });

  // File upload endpoint
  app.post("/api/upload", requireAuth, upload.single("file"), (req: any, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const url = `/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.originalname, size: req.file.size });
  });

  // ─── Projects ───────────────────────────────────────────────────────────────
  app.get(api.projects.list.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    res.json(await storage.getProjects(userId));
  });

  app.get(api.projects.get.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const item = await storage.getProject(Number(req.params.id), userId);
    if (!item) return res.status(404).json({ message: "Project not found" });
    res.json(item);
  });

  app.post(api.projects.create.path, requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bodySchema = api.projects.create.input.extend({
        latitude: z.union([z.string(), z.number()]).transform(v => String(v)),
        longitude: z.union([z.string(), z.number()]).transform(v => String(v)),
        budget: z.union([z.string(), z.number()]).optional().transform(v => v ? String(v) : undefined),
      });
      const input = bodySchema.parse(req.body);
      res.status(201).json(await storage.createProject(userId, input));
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      throw err;
    }
  });

  app.put(api.projects.update.path, requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bodySchema = api.projects.update.input.extend({
        latitude: z.union([z.string(), z.number()]).transform(v => String(v)).optional(),
        longitude: z.union([z.string(), z.number()]).transform(v => String(v)).optional(),
        budget: z.union([z.string(), z.number()]).optional().transform(v => v ? String(v) : undefined),
      });
      const input = bodySchema.parse(req.body);
      const item = await storage.updateProject(Number(req.params.id), userId, input);
      if (!item) return res.status(404).json({ message: "Project not found" });
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      throw err;
    }
  });

  app.delete(api.projects.delete.path, requireAuth, async (req: any, res) => {
    await storage.deleteProject(Number(req.params.id), req.user.claims.sub);
    res.status(204).send();
  });

  // ─── Visits ─────────────────────────────────────────────────────────────────
  app.get(api.visits.list.path, requireAuth, async (req: any, res) => {
    const project = await storage.getProject(Number(req.params.projectId), req.user.claims.sub);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(await storage.getVisits(project.id));
  });

  app.post(api.visits.create.path, requireAuth, async (req: any, res) => {
    try {
      const project = await storage.getProject(Number(req.params.projectId), req.user.claims.sub);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const input = api.visits.create.input.parse(req.body);
      res.status(201).json(await storage.createVisit(project.id, input));
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      throw err;
    }
  });

  // ─── Documents ──────────────────────────────────────────────────────────────
  app.get(api.documents.list.path, requireAuth, async (req: any, res) => {
    const project = await storage.getProject(Number(req.params.projectId), req.user.claims.sub);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(await storage.getDocuments(project.id));
  });

  app.post(api.documents.create.path, requireAuth, async (req: any, res) => {
    try {
      const project = await storage.getProject(Number(req.params.projectId), req.user.claims.sub);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const input = api.documents.create.input.parse(req.body);
      res.status(201).json(await storage.createDocument(project.id, input));
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      throw err;
    }
  });

  // ─── Dashboard ──────────────────────────────────────────────────────────────
  app.get(api.dashboard.stats.path, requireAuth, async (req: any, res) => {
    res.json(await storage.getDashboardStats(req.user.claims.sub));
  });

  return httpServer;
}
