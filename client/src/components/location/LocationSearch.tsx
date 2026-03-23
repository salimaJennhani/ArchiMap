import { useState, useCallback, useRef, useEffect } from "react";
import { MapPin, Loader2, LocateFixed, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPreview } from "@/components/map/ProjectMap";

export interface LocationResult {
  lat: number;
  lng: number;
  address: string;
  displayName: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  addresstype?: string;
  type?: string;
  address?: {
    country?: string;
    country_code?: string;
    state?: string;
    city?: string;
    town?: string;
  };
}

interface LocationSearchProps {
  onSelect: (result: LocationResult) => void;
  defaultLat?: number;
  defaultLng?: number;
  defaultAddress?: string;
}

async function nominatimSearch(query: string, countryCode?: string): Promise<NominatimResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "6",
    addressdetails: "1",
  });
  if (countryCode) params.set("countrycodes", countryCode);
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { "Accept-Language": "en" },
  });
  return res.json();
}

async function fetchCities(countryCode: string, countryName: string): Promise<NominatimResult[]> {
  // Search for populated places in the country
  const params = new URLSearchParams({
    q: countryName,
    format: "json",
    limit: "10",
    addressdetails: "1",
    featuretype: "city",
    countrycodes: countryCode,
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { "Accept-Language": "en" },
  });
  const data: NominatimResult[] = await res.json();

  // If featuretype=city returns few results, fall back to city names
  if (data.length < 3) {
    const fallback = await fetch(
      `https://nominatim.openstreetmap.org/search?q=city+in+${encodeURIComponent(countryName)}&format=json&limit=10&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    return fallback.json();
  }
  return data;
}

export function LocationSearch({ onSelect, defaultLat, defaultLng, defaultAddress }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<LocationResult | null>(
    defaultLat && defaultLng ? { lat: defaultLat, lng: defaultLng, address: defaultAddress || "", displayName: defaultAddress || "" } : null
  );
  const [cityLoading, setCityLoading] = useState(false);
  const [cities, setCities] = useState<NominatimResult[]>([]);
  const [countryContext, setCountryContext] = useState<{ name: string; code: string } | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced live search
  const handleInput = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await nominatimSearch(value);
        setResults(data);
        setOpen(true);
      } catch { setResults([]); } finally { setLoading(false); }
    }, 450);
  }, []);

  const handleSelectResult = async (r: NominatimResult) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    const shortLabel = r.display_name.split(",").slice(0, 2).join(",").trim();

    const location: LocationResult = { lat, lng, address: r.display_name, displayName: shortLabel };
    setSelected(location);
    onSelect(location);
    setQuery(shortLabel);
    setResults([]);
    setOpen(false);
    setCities([]);
    setCountryContext(null);

    // Detect if result is country-level → offer city propositions
    const isCountry = r.addresstype === "country" || r.type === "country" ||
      (r.address?.country && r.display_name.trim() === r.address.country.trim());
    const countryCode = r.address?.country_code;
    const countryName = r.address?.country || r.display_name.split(",")[0].trim();

    if (countryCode && (isCountry || r.display_name.split(",").length <= 2)) {
      setCountryContext({ name: countryName, code: countryCode });
      setCityLoading(true);
      try {
        const cityData = await fetchCities(countryCode, countryName);
        // Filter to just cities/towns with meaningful addresses
        const filtered = cityData.filter(c => c.address?.city || c.address?.town || c.display_name);
        setCities(filtered.slice(0, 8));
      } catch { setCities([]); } finally { setCityLoading(false); }
    }
  };

  const handleSelectCity = (city: NominatimResult) => {
    const lat = parseFloat(city.lat);
    const lng = parseFloat(city.lon);
    const name = city.address?.city || city.address?.town || city.display_name.split(",")[0];
    const label = `${name}, ${countryContext?.name}`;
    const location: LocationResult = { lat, lng, address: city.display_name, displayName: label };
    setSelected(location);
    onSelect(location);
    setQuery(label);
    setCities([]);
    setCountryContext(null);
  };

  const clearSelection = () => {
    setSelected(null);
    setQuery("");
    setCities([]);
    setCountryContext(null);
    setResults([]);
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Location Search</label>

      {/* Search input */}
      <div className="relative" ref={containerRef}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => handleInput(e.target.value)}
              onFocus={() => results.length > 0 && setOpen(true)}
              placeholder="Type a country, city or address…"
              className="pl-9 pr-8"
            />
            {query && (
              <button type="button" onClick={clearSelection} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button type="button" variant="secondary" disabled={loading} onClick={() => { if (query.trim()) { setLoading(true); nominatimSearch(query).then(d => { setResults(d); setOpen(true); }).finally(() => setLoading(false)); } }} className="shrink-0 px-3">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
          </Button>
        </div>

        {/* Dropdown results — absolutely positioned to avoid clipping */}
        {open && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-background border border-border rounded-xl shadow-2xl overflow-hidden" style={{ zIndex: 9999 }}>
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={e => { e.preventDefault(); handleSelectResult(r); }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors border-b border-border/40 last:border-0 flex items-start gap-2"
              >
                <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <span className="truncate">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* City chips — appear after selecting a country */}
      {(cityLoading || cities.length > 0) && countryContext && (
        <div className="bg-muted/40 rounded-xl p-4 border border-border/50">
          <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5" />
            Cities in <span className="text-foreground font-bold">{countryContext.name}</span> — pick one to zoom in:
          </p>
          {cityLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading cities…
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {cities.map((city, i) => {
                const name = city.address?.city || city.address?.town || city.display_name.split(",")[0];
                return (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); handleSelectCity(city); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-background border border-border hover:border-primary hover:bg-primary/5 hover:text-primary transition-all"
                  >
                    <MapPin className="w-3 h-3" />{name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Live map preview */}
      {selected && !isNaN(selected.lat) && !isNaN(selected.lng) && selected.lat !== 0 && selected.lng !== 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {selected.displayName}
          </p>
          <MapPreview lat={selected.lat} lng={selected.lng} height="170px" />
        </div>
      )}
    </div>
  );
}
