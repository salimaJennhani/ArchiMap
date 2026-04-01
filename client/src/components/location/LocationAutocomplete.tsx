import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, Loader2, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPreview } from "@/components/map/ProjectMap";

export type LocationValue = {
  lat: number;
  lng: number;
  address: string;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

async function geocodeTunisia(query: string): Promise<NominatimResult[]> {
  const params = new URLSearchParams({ q: query, countrycodes: "tn" });
  let proxyError: string | null = null;

  // Prefer server proxy (stable headers/timeouts), but fall back to direct Nominatim
  // so autocomplete still works if the session/proxy is unavailable.
  try {
    const res = await fetch(`/api/geocode?${params}`, { credentials: "include" });
    if (res.ok) return res.json();
    proxyError = `proxy ${res.status}`;
  } catch {
    // fall through
    proxyError = "proxy network error";
  }

  const directParams = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "8",
    addressdetails: "1",
    countrycodes: "tn",
    dedupe: "1",
    viewbox: "7.524,37.6,11.6,30.2",
    bounded: "1",
  });

  const direct = await fetch(`https://nominatim.openstreetmap.org/search?${directParams}`, {
    headers: { "Accept-Language": "fr,en" },
  });
  if (!direct.ok) throw new Error(`Geocode failed (${proxyError ?? "proxy unknown"}, direct ${direct.status})`);
  return direct.json();
}

async function reverseGeocode(lat: number, lng: number): Promise<{ display_name?: string } | null> {
  const url = `/api/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`;
  try {
    const res = await fetch(url, { credentials: "include" });
    if (res.ok) return res.json();
  } catch {
    // fall through
  }

  const directParams = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "jsonv2",
    addressdetails: "1",
  });
  try {
    const direct = await fetch(`https://nominatim.openstreetmap.org/reverse?${directParams}`, {
      headers: { "Accept-Language": "fr,en" },
    });
    if (!direct.ok) return null;
    return direct.json();
  } catch {
    return null;
  }
}

export function LocationAutocomplete({
  value,
  onChange,
  label = "Location",
  placeholder = "Search an address in Tunisia…",
  error,
}: {
  value: LocationValue | null;
  onChange: (value: LocationValue | null) => void;
  label?: string;
  placeholder?: string;
  error?: string;
}) {
  const [query, setQuery] = useState(value?.address ?? "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keep input aligned when external value changes (edit form, reset, etc.)
  useEffect(() => {
    if (value?.address) setQuery(value.address);
    if (!value) setQuery("");
  }, [value?.address, value?.lat, value?.lng]);

  const showError = error || localError;
  const isBusy = loading || geoLoading;

  const clear = () => {
    setLocalError(null);
    setResults([]);
    setOpen(false);
    setQuery("");
    onChange(null);
  };

  const runSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    setQuery(q);
    setLocalError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!trimmed) {
      setResults([]);
      setOpen(false);
      onChange(null);
      return;
    }

    // Avoid rate limits + improve relevance: wait for a few characters.
    if (trimmed.length < 3) {
      setResults([]);
      setOpen(true);
      return;
    }

    // If the user types after selecting, we consider it a new search until they pick again.
    if (value) onChange(null);

    setOpen(true);
    debounceRef.current = setTimeout(async () => {
      const reqId = ++reqIdRef.current;
      setLoading(true);
      try {
        const data = await geocodeTunisia(trimmed);
        if (reqId !== reqIdRef.current) return;
        setResults(data);
        setOpen(true);
      } catch {
        if (reqId !== reqIdRef.current) return;
        setResults([]);
        setLocalError("Couldn’t fetch suggestions. If you just updated the server, restart `npm run dev` and try again.");
      } finally {
        if (reqId === reqIdRef.current) setLoading(false);
      }
    }, 250);
  }, [onChange, value]);

  const selectResult = async (r: NominatimResult) => {
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const address = r.display_name;
    setQuery(address);
    setResults([]);
    setOpen(false);
    setLocalError(null);
    onChange({ lat, lng, address });
  };

  const useMyLocation = async () => {
    if (!navigator.geolocation) {
      setLocalError("Geolocation is not supported in this browser.");
      return;
    }
    setGeoLoading(true);
    setLocalError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }),
      );
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const rev = await reverseGeocode(lat, lng);
      const address = rev?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setQuery(address);
      setResults([]);
      setOpen(false);
      onChange({ lat, lng, address });
    } catch {
      setLocalError("Unable to get your current location. Please allow location access.");
    } finally {
      setGeoLoading(false);
    }
  };

  const selectedLabel = useMemo(() => {
    if (!value) return null;
    return value.address.split(",").slice(0, 2).join(",").trim();
  }, [value]);

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">{label}</label>

      <div className="relative" ref={containerRef}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => runSearch(e.target.value)}
              onFocus={() => query.trim() && setOpen(true)}
              placeholder={placeholder}
              className="pl-9 pr-8"
            />
            {query && (
              <button
                type="button"
                onClick={clear}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <Button
            type="button"
            variant="secondary"
            disabled={isBusy}
            onClick={() => (query.trim() ? runSearch(query) : useMyLocation())}
            className="shrink-0 px-3"
            title={query.trim() ? "Search" : "Use my current location"}
          >
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
          </Button>
        </div>

        {open && (loading || results.length > 0 || query.trim().length > 0) && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-background border border-border rounded-xl shadow-2xl overflow-hidden" style={{ zIndex: 9999 }}>
            {loading ? (
              <div className="px-3 py-3 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching…
              </div>
            ) : query.trim().length > 0 && query.trim().length < 3 ? (
              <div className="px-3 py-3 text-sm text-muted-foreground">
                Type at least 3 letters to see suggestions.
              </div>
            ) : (
              results.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); selectResult(r); }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors border-b border-border/40 last:border-0 flex items-start gap-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                  <span className="truncate">{r.display_name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {showError && <p className="text-xs text-red-500">{showError}</p>}

      {value && Number.isFinite(value.lat) && Number.isFinite(value.lng) && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {selectedLabel}
          </p>
          <MapPreview lat={value.lat} lng={value.lng} height="170px" />
        </div>
      )}
    </div>
  );
}

