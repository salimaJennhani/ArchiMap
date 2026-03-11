import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // Protected middleware for API routes
  const requireAuth = isAuthenticated;

  // Projects
  app.get(api.projects.list.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const items = await storage.getProjects(userId);
    res.json(items);
  });

  app.get(api.projects.get.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = Number(req.params.id);
    const item = await storage.getProject(id, userId);
    if (!item) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json(item);
  });

  app.post(api.projects.create.path, requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // coerce latitude/longitude/budget if sent as strings from form
      const bodySchema = api.projects.create.input.extend({
        latitude: z.union([z.string(), z.number()]).transform(v => String(v)),
        longitude: z.union([z.string(), z.number()]).transform(v => String(v)),
        budget: z.union([z.string(), z.number()]).optional().transform(v => v ? String(v) : undefined),
      });
      const input = bodySchema.parse(req.body);
      const item = await storage.createProject(userId, input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.projects.update.path, requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = Number(req.params.id);
      
      const bodySchema = api.projects.update.input.extend({
        latitude: z.union([z.string(), z.number()]).transform(v => String(v)).optional(),
        longitude: z.union([z.string(), z.number()]).transform(v => String(v)).optional(),
        budget: z.union([z.string(), z.number()]).optional().transform(v => v ? String(v) : undefined),
      });
      const input = bodySchema.parse(req.body);
      
      const item = await storage.updateProject(id, userId, input);
      if (!item) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.projects.delete.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = Number(req.params.id);
    await storage.deleteProject(id, userId);
    res.status(204).send();
  });

  // Visits
  app.get(api.visits.list.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const projectId = Number(req.params.projectId);
    
    // Verify project belongs to user
    const project = await storage.getProject(projectId, userId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const items = await storage.getVisits(projectId);
    res.json(items);
  });

  app.post(api.visits.create.path, requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = Number(req.params.projectId);
      
      const project = await storage.getProject(projectId, userId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const input = api.visits.create.input.parse(req.body);
      const item = await storage.createVisit(projectId, input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Documents
  app.get(api.documents.list.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const projectId = Number(req.params.projectId);
    
    const project = await storage.getProject(projectId, userId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const items = await storage.getDocuments(projectId);
    res.json(items);
  });

  app.post(api.documents.create.path, requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = Number(req.params.projectId);
      
      const project = await storage.getProject(projectId, userId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const input = api.documents.create.input.parse(req.body);
      const item = await storage.createDocument(projectId, input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Dashboard Stats
  app.get(api.dashboard.stats.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const stats = await storage.getDashboardStats(userId);
    res.json(stats);
  });

  return httpServer;
}
