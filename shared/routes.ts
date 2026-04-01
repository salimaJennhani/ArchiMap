import { z } from 'zod';
import { insertProjectSchema, insertVisitSchema, insertDocumentSchema, projects, visits, documents } from './schema';

export { insertProjectSchema, insertVisitSchema, insertDocumentSchema };

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  })
};

export const api = {
  projects: {
    list: {
      method: 'GET' as const,
      path: '/api/projects' as const,
      responses: {
        200: z.array(z.custom<typeof projects.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/projects/:id' as const,
      responses: {
        200: z.custom<typeof projects.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects' as const,
      input: insertProjectSchema,
      responses: {
        201: z.custom<typeof projects.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/projects/:id' as const,
      input: insertProjectSchema.partial(),
      responses: {
        200: z.custom<typeof projects.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/projects/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  visits: {
    list: {
      method: 'GET' as const,
      path: '/api/projects/:projectId/visits' as const,
      responses: {
        200: z.array(z.custom<typeof visits.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects/:projectId/visits' as const,
      input: insertVisitSchema.omit({ projectId: true }),
      responses: {
        201: z.custom<typeof visits.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  documents: {
    list: {
      method: 'GET' as const,
      path: '/api/projects/:projectId/documents' as const,
      responses: {
        200: z.array(z.custom<typeof documents.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects/:projectId/documents' as const,
      input: insertDocumentSchema.omit({ projectId: true }),
      responses: {
        201: z.custom<typeof documents.$inferSelect>(),
        400: errorSchemas.validation,
      },
    }
  },
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/dashboard/stats' as const,
      responses: {
        200: z.object({
          totalProjects: z.number(),
          activeProjects: z.number(),
          upcomingVisits: z.number(),
          totalVisits: z.number(),
          visitsThisMonth: z.number(),
          totalIssues: z.number(),
        })
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
