import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateVisitRequest } from "@shared/routes";

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

export function useCreateVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number, data: CreateVisitRequest }) => {
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
    },
  });
}
