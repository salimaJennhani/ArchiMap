import { db } from "./db";
import {
  projects, visits, documents,
  type CreateProjectRequest, type UpdateProjectRequest, type Project,
  type CreateVisitRequest, type UpdateVisitRequest, type Visit,
  type CreateDocumentRequest, type Document,
  type DashboardStats, type UpcomingVisit,
  type VisitWithProject, type DocumentWithProject,
} from "@shared/schema";
import { eq, and, gte } from "drizzle-orm";

export interface IStorage {
  getProjects(userId: string): Promise<Project[]>;
  getProject(id: number, userId: string): Promise<Project | undefined>;
  createProject(userId: string, project: CreateProjectRequest): Promise<Project>;
  updateProject(id: number, userId: string, updates: UpdateProjectRequest): Promise<Project | undefined>;
  deleteProject(id: number, userId: string): Promise<void>;

  getVisits(projectId: number): Promise<Visit[]>;
  getAllVisitsWithProject(userId: string): Promise<VisitWithProject[]>;
  getUpcomingVisits(userId: string): Promise<UpcomingVisit[]>;
  createVisit(projectId: number, visit: Omit<CreateVisitRequest, "projectId">): Promise<Visit>;
  updateVisit(id: number, updates: Omit<UpdateVisitRequest, "projectId">): Promise<Visit | undefined>;
  deleteVisit(id: number): Promise<void>;

  getDocuments(projectId: number): Promise<Document[]>;
  getAllDocumentsWithProject(userId: string): Promise<DocumentWithProject[]>;
  createDocument(projectId: number, document: Omit<CreateDocumentRequest, "projectId">): Promise<Document>;
  deleteDocument(id: number): Promise<void>;

  getDashboardStats(userId: string): Promise<DashboardStats>;
}

export class DatabaseStorage implements IStorage {
  async getProjects(userId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.userId, userId));
  }

  async getProject(id: number, userId: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.userId, userId)));
    return project;
  }

  async createProject(userId: string, projectData: CreateProjectRequest): Promise<Project> {
    const [newProject] = await db.insert(projects).values({ ...projectData, userId }).returning();
    return newProject;
  }

  async updateProject(id: number, userId: string, updates: UpdateProjectRequest): Promise<Project | undefined> {
    const [updated] = await db.update(projects).set(updates).where(and(eq(projects.id, id), eq(projects.userId, userId))).returning();
    return updated;
  }

  async deleteProject(id: number, userId: string): Promise<void> {
    const projectVisits = await db.select().from(visits).where(eq(visits.projectId, id));
    const projectDocs = await db.select().from(documents).where(eq(documents.projectId, id));
    for (const v of projectVisits) await db.delete(visits).where(eq(visits.id, v.id));
    for (const d of projectDocs) await db.delete(documents).where(eq(documents.id, d.id));
    await db.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, userId)));
  }

  async getVisits(projectId: number): Promise<Visit[]> {
    return await db.select().from(visits).where(eq(visits.projectId, projectId));
  }

  async getAllVisitsWithProject(userId: string): Promise<VisitWithProject[]> {
    const userProjects = await this.getProjects(userId);
    const result: VisitWithProject[] = [];
    for (const p of userProjects) {
      const pVisits = await db.select().from(visits).where(eq(visits.projectId, p.id));
      for (const v of pVisits) {
        result.push({
          ...v,
          projectName: p.name,
          projectClient: p.client,
          projectAddress: p.address ?? null,
          projectStatus: p.status,
        });
      }
    }
    return result.sort((a, b) => String(b.visitDate).localeCompare(String(a.visitDate)));
  }

  async getUpcomingVisits(userId: string): Promise<UpcomingVisit[]> {
    const today = new Date().toISOString().split("T")[0];
    const userProjects = await this.getProjects(userId);
    const result: UpcomingVisit[] = [];
    for (const p of userProjects) {
      const pVisits = await db.select().from(visits)
        .where(and(eq(visits.projectId, p.id), gte(visits.visitDate, today)));
      for (const v of pVisits) {
        result.push({
          visitId: v.id,
          visitDate: String(v.visitDate),
          notes: v.notes,
          progressStatus: v.progressStatus,
          projectId: p.id,
          projectName: p.name,
          projectClient: p.client,
        });
      }
    }
    return result.sort((a, b) => a.visitDate.localeCompare(b.visitDate));
  }

  async createVisit(projectId: number, visitData: Omit<CreateVisitRequest, "projectId">): Promise<Visit> {
    const [newVisit] = await db.insert(visits).values({ ...visitData, projectId }).returning();
    return newVisit;
  }

  async updateVisit(id: number, updates: Omit<UpdateVisitRequest, "projectId">): Promise<Visit | undefined> {
    const [updated] = await db.update(visits).set(updates).where(eq(visits.id, id)).returning();
    return updated;
  }

  async deleteVisit(id: number): Promise<void> {
    await db.delete(visits).where(eq(visits.id, id));
  }

  async getDocuments(projectId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.projectId, projectId));
  }

  async getAllDocumentsWithProject(userId: string): Promise<DocumentWithProject[]> {
    const userProjects = await this.getProjects(userId);
    const result: DocumentWithProject[] = [];
    for (const p of userProjects) {
      const pDocs = await db.select().from(documents).where(eq(documents.projectId, p.id));
      for (const d of pDocs) {
        result.push({
          ...d,
          projectName: p.name,
          projectClient: p.client,
        });
      }
    }
    return result.sort((a, b) => new Date(b.uploadDate!).getTime() - new Date(a.uploadDate!).getTime());
  }

  async createDocument(projectId: number, documentData: Omit<CreateDocumentRequest, "projectId">): Promise<Document> {
    const [newDoc] = await db.insert(documents).values({ ...documentData, projectId }).returning();
    return newDoc;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async getDashboardStats(userId: string): Promise<DashboardStats> {
    const userProjects = await this.getProjects(userId);
    const activeProjects = userProjects.filter(p => p.status === "active").length;
    const upcoming = await this.getUpcomingVisits(userId);
    const allVisits = await this.getAllVisitsWithProject(userId);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const visitsThisMonth = allVisits.filter(v => String(v.visitDate) >= monthStart).length;
    const totalIssues = allVisits.filter(v => v.detectedIssues && v.detectedIssues.trim().length > 0).length;

    return {
      totalProjects: userProjects.length,
      activeProjects,
      upcomingVisits: upcoming.length,
      totalVisits: allVisits.length,
      visitsThisMonth,
      totalIssues,
    };
  }
}

export const storage = new DatabaseStorage();
