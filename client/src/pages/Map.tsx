import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useProjects } from "@/hooks/use-projects";
import { ProjectMap } from "@/components/map/ProjectMap";
import { Loader2, Search, List, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { LocationAutocomplete, type LocationValue } from "@/components/location/LocationAutocomplete";
import { Link } from "wouter";

export default function MapPage() {
  const { data: projects, isLoading } = useProjects();
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState<LocationValue | null>(null);

  const filtered = useMemo(() => {
    const list = projects ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(p => p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q) || (p.address ?? "").toLowerCase().includes(q));
  }, [projects, query]);

  return (
    <ProtectedLayout>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-[360px] shrink-0 space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-display)' }}>Map</h1>
            <p className="text-muted-foreground">Search places and jump between your projects in Tunisia.</p>
          </div>

          <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Search className="w-4 h-4 text-primary" /> Search a place
            </div>
            <LocationAutocomplete value={place} onChange={setPlace} />
          </div>

          <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <List className="w-4 h-4 text-primary" /> Projects
              </div>
              <span className="text-xs text-muted-foreground">{filtered.length}</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by name, client, address…" className="pl-9" />
            </div>

            {isLoading ? (
              <div className="py-8 flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading projects…
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No projects match your search.
              </div>
            ) : (
              <div className="max-h-[340px] overflow-y-auto divide-y divide-border/50 rounded-xl border border-border/50">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlace({ lat: Number(p.latitude), lng: Number(p.longitude), address: p.address ?? `${p.name}, ${p.client}` })}
                    className="w-full text-left p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{p.client}</div>
                        {p.address && (
                          <div className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" /> {p.address}
                          </div>
                        )}
                      </div>
                      <Link href={`/projects/${p.id}`} className="text-xs text-primary hover:underline shrink-0">Open</Link>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 bg-card rounded-3xl p-2 shadow-xl border border-border/50 h-[calc(100vh-200px)] min-h-[520px]">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-2xl">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
          ) : (
            <ProjectMap
              projects={projects || []}
              height="100%"
              focus={place ? { lat: place.lat, lng: place.lng, zoom: 14 } : null}
              showControls
            />
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}
