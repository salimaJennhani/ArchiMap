import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { CreateVisitRequest } from "@shared/schema";

export function useVisits(projectId: number) {
  return useQuery({
    queryKey: [api.visits.list.path, projectId],
    queryFn: async () => {
      const url = buildUrl(api.visits.list.path, { projectId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch visits");
      return api.visits.list.responses[200].parse(await res.json());
    },
    enabled: !!projectId,
  });
}

export function useUpcomingVisits() {
  return useQuery({
    queryKey: ["/api/visits/upcoming"],
    queryFn: async () => {
      const res = await fetch("/api/visits/upcoming", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch upcoming visits");
      return res.json() as Promise<Array<{
        visitId: number; visitDate: string; notes: string | null;
        progressStatus: string | null; projectId: number;
        projectName: string; projectClient: string;
      }>>;
    },
  });
}

export function useCreateVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: any }) => {
      const url = buildUrl(api.visits.create.path, { projectId });
      const res = await fetch(url, {
        method: api.visits.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create visit");
      return api.visits.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.visits.list.path, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
  });
}

export function useUpdateVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId, data }: { id: number; projectId: number; data: any }) => {
      const res = await fetch(`/api/visits/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update visit");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.visits.list.path, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits/upcoming"] });
    },
  });
}

export function useDeleteVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: number; projectId: number }) => {
      const res = await fetch(`/api/visits/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete visit");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.visits.list.path, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
  });
}
