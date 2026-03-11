import { db } from "./db";
import { 
  projects, visits, documents,
  type CreateProjectRequest, type UpdateProjectRequest, type Project,
  type CreateVisitRequest, type UpdateVisitRequest, type Visit,
  type CreateDocumentRequest, type Document,
  type DashboardStats
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Projects
  getProjects(userId: string): Promise<Project[]>;
  getProject(id: number, userId: string): Promise<Project | undefined>;
  createProject(userId: string, project: CreateProjectRequest): Promise<Project>;
  updateProject(id: number, userId: string, updates: UpdateProjectRequest): Promise<Project | undefined>;
  deleteProject(id: number, userId: string): Promise<void>;

  // Visits
  getVisits(projectId: number): Promise<Visit[]>;
  createVisit(projectId: number, visit: Omit<CreateVisitRequest, "projectId">): Promise<Visit>;
  
  // Documents
  getDocuments(projectId: number): Promise<Document[]>;
  createDocument(projectId: number, document: Omit<CreateDocumentRequest, "projectId">): Promise<Document>;

  // Dashboard
  getDashboardStats(userId: string): Promise<DashboardStats>;
}

export class DatabaseStorage implements IStorage {
  
  async getProjects(userId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.userId, userId));
  }

  async getProject(id: number, userId: string): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));
    return project;
  }

  async createProject(userId: string, projectData: CreateProjectRequest): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values({ ...projectData, userId })
      .returning();
    return newProject;
  }

  async updateProject(id: number, userId: string, updates: UpdateProjectRequest): Promise<Project | undefined> {
    const [updated] = await db
      .update(projects)
      .set(updates)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .returning();
    return updated;
  }

  async deleteProject(id: number, userId: string): Promise<void> {
    await db.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, userId)));
  }

  async getVisits(projectId: number): Promise<Visit[]> {
    return await db.select().from(visits).where(eq(visits.projectId, projectId));
  }

  async createVisit(projectId: number, visitData: Omit<CreateVisitRequest, "projectId">): Promise<Visit> {
    const [newVisit] = await db
      .insert(visits)
      .values({ ...visitData, projectId })
      .returning();
    return newVisit;
  }

  async getDocuments(projectId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.projectId, projectId));
  }

  async createDocument(projectId: number, documentData: Omit<CreateDocumentRequest, "projectId">): Promise<Document> {
    const [newDoc] = await db
      .insert(documents)
      .values({ ...documentData, projectId })
      .returning();
    return newDoc;
  }

  async getDashboardStats(userId: string): Promise<DashboardStats> {
    const userProjects = await this.getProjects(userId);
    const activeProjects = userProjects.filter(p => p.status === 'active').length;
    
    // Simplistic count of upcoming visits for MVP (could be refined with dates)
    let upcomingVisits = 0;
    for (const p of userProjects) {
        const pVisits = await this.getVisits(p.id);
        const now = new Date();
        upcomingVisits += pVisits.filter(v => new Date(v.visitDate) > now).length;
    }

    return {
      totalProjects: userProjects.length,
      activeProjects,
      upcomingVisits
    };
  }
}

export const storage = new DatabaseStorage();
