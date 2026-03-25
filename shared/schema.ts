import { pgTable, text,uuid, serial, integer, timestamp, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql, relations } from "drizzle-orm";
// import { pgTable, text, uuid } from "drizzle-orm/pg-core";

// Table users pour auth locale
export const users = pgTable("users", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").unique(),
  password: text("password"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Les autres tables restent inchangées

// export * from "./models/auth";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  client: text("client").notNull(),
  address: text("address"),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  description: text("description"),
  budget: numeric("budget"),
  status: text("status").notNull().default("planned"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const visits = pgTable("visits", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  visitDate: date("visit_date").notNull(),
  notes: text("notes"),
  progressStatus: text("progress_status"),
  detectedIssues: text("detected_issues"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  name: text("name").notNull(),
  fileUrl: text("file_url").notNull(),
  type: text("type").notNull(),
  uploadDate: timestamp("upload_date").defaultNow(),
});

export const projectsRelations = relations(projects, ({ many, one }) => ({
  visits: many(visits),
  documents: many(documents),
  user: one(users, { fields: [projects.userId], references: [users.id] }),
}));

export const visitsRelations = relations(visits, ({ one }) => ({
  project: one(projects, { fields: [visits.projectId], references: [projects.id] }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  project: one(projects, { fields: [documents.projectId], references: [projects.id] }),
}));

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, userId: true });
export const insertVisitSchema = createInsertSchema(visits).omit({ id: true, createdAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, uploadDate: true });

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type CreateProjectRequest = InsertProject;
export type UpdateProjectRequest = Partial<InsertProject>;

export type Visit = typeof visits.$inferSelect;
export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type CreateVisitRequest = InsertVisit;
export type UpdateVisitRequest = Partial<InsertVisit>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type CreateDocumentRequest = InsertDocument;

export interface VisitWithProject extends Visit {
  projectName: string;
  projectClient: string;
  projectAddress: string | null;
  projectStatus: string;
}

export interface DocumentWithProject extends Document {
  projectName: string;
  projectClient: string;
}

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  upcomingVisits: number;
  totalVisits: number;
  visitsThisMonth: number;
  totalIssues: number;
}

export interface UpcomingVisit {
  visitId: number;
  visitDate: string;
  notes: string | null;
  progressStatus: string | null;
  projectId: number;
  projectName: string;
  projectClient: string;
}
