import type { Express } from "express";
import type { Server } from "http";
import path from "path";
import fs from "fs";
import multer from "multer";
import session from "express-session";
import bcrypt from "bcrypt";
import { z } from "zod";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "./storage";
import { api } from "@shared/routes";

// ─── Middleware Session ───────────────────────────────────────────────
export function setupSession(app: Express) {
  app.use(
    session({
      secret: "dev-secret", // à changer en production
      resave: false,
      saveUninitialized: false,
    })
  );
}

// ─── Middleware Auth ─────────────────────────────────────────────────
export function isAuthenticated(req: any, res: any, next: any) {
  if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ─── Routes Auth Locales ─────────────────────────────────────────────
export function registerAuthRoutes(app: Express) {
  // REGISTER
  app.post("/auth/register", async (req, res) => {
    const { email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    await db.insert(users).values({ email, password: hashed });
    res.json({ message: "User created" });
  });

  // LOGIN
  app.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await db.select().from(users).where(eq(users.email, email)).then(r => r[0]);
    if (!user) return res.status(400).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Wrong password" });

    req.session.user = { id: user.id, email: user.email };
    res.json({ message: "Logged in" });
  });

  // LOGOUT
  app.post("/auth/logout", (req, res) => {
    req.session.destroy(err => {
      if (err) return res.status(500).json({ error: "Logout failed" });
      res.json({ message: "Logged out" });
    });
  });

  // CURRENT USER
  app.get("/auth/me", (req, res) => {
    res.json(req.session.user || null);
  });
}

// ─── Upload Config ───────────────────────────────────────────────────
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

// ─── Zod helpers ─────────────────────────────────────────────────────
const numStr = z.union([z.string(), z.number()]).transform(v => String(v));
const numStrOpt = z.union([z.string(), z.number()]).optional().transform(v => (v !== undefined && v !== "" ? String(v) : undefined));

// ─── Register All Routes ─────────────────────────────────────────────
export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Auth
  setupSession(app);
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

  // ─── Projects ───────────────────────────────────────────────────────
  app.get(api.projects.list.path, auth, async (req: any, res) => {
    res.json(await storage.getProjects(req.session.user.id));
  });

  app.get(api.projects.get.path, auth, async (req: any, res) => {
    const item = await storage.getProject(Number(req.params.id), req.session.user.id);
    if (!item) return res.status(404).json({ message: "Project not found" });
    res.json(item);
  });

  app.post(api.projects.create.path, auth, async (req: any, res) => {
    try {
      const bodySchema = api.projects.create.input.extend({
        latitude: numStr, longitude: numStr, budget: numStrOpt,
      });
      const input = bodySchema.parse(req.body);
      res.status(201).json(await storage.createProject(req.session.user.id, input));
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
      const item = await storage.updateProject(Number(req.params.id), req.session.user.id, input);
      if (!item) return res.status(404).json({ message: "Project not found" });
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      throw err;
    }
  });

  app.delete(api.projects.delete.path, auth, async (req: any, res) => {
    await storage.deleteProject(Number(req.params.id), req.session.user.id);
    res.status(204).send();
  });

  // ─── Visits ────────────────────────────────────────────────────────
  app.get("/api/visits/upcoming", auth, async (req: any, res) => {
    res.json(await storage.getUpcomingVisits(req.session.user.id));
  });

  app.get("/api/visits", auth, async (req: any, res) => {
    res.json(await storage.getAllVisitsWithProject(req.session.user.id));
  });

  app.get(api.visits.list.path, auth, async (req: any, res) => {
    const project = await storage.getProject(Number(req.params.projectId), req.session.user.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(await storage.getVisits(project.id));
  });

  app.post(api.visits.create.path, auth, async (req: any, res) => {
    try {
      const project = await storage.getProject(Number(req.params.projectId), req.session.user.id);
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

  app.delete("/api/visits/:id", auth, async (req, res) => {
    await storage.deleteVisit(Number(req.params.id));
    res.status(204).send();
  });

  // ─── Documents ──────────────────────────────────────────────────────
  app.get("/api/documents", auth, async (req: any, res) => {
    res.json(await storage.getAllDocumentsWithProject(req.session.user.id));
  });

  app.get(api.documents.list.path, auth, async (req: any, res) => {
    const project = await storage.getProject(Number(req.params.projectId), req.session.user.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(await storage.getDocuments(project.id));
  });

  app.post(api.documents.create.path, auth, async (req: any, res) => {
    try {
      const project = await storage.getProject(Number(req.params.projectId), req.session.user.id);
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

  // ─── Dashboard ──────────────────────────────────────────────────────
  app.get(api.dashboard.stats.path, auth, async (req: any, res) => {
    res.json(await storage.getDashboardStats(req.session.user.id));
  });

  return httpServer;
}