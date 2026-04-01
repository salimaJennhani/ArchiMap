import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { type Project } from '@shared/schema';
import { Link } from 'wouter';
import { parseLatLng } from '@/lib/map/coords';
import { initLeafletDefaultIcon } from '@/lib/map/leaflet';

initLeafletDefaultIcon();

const createCustomIcon = (status: string) => {
  const color = status === 'active' ? '#22c55e' : status === 'completed' ? '#3b82f6' : '#f59e0b';
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="background-color: ${color}; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.2);"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

const previewIcon = L.divIcon({
  className: 'custom-leaflet-icon',
  html: `<div style="background-color: #3b82f6; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgb(0 0 0 / 0.3);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function MapBounds({ projects }: { projects: Project[] }) {
  const map = useMap();
  useEffect(() => {
    const coords = projects
      .map(p => ({ p, ll: parseLatLng(p.latitude, p.longitude) }))
      .filter((x): x is { p: Project; ll: { lat: number; lng: number } } => x.ll !== null);

    if (coords.length > 0) {
      if (coords.length === 1) {
        map.setView([coords[0].ll.lat, coords[0].ll.lng], 13);
      } else {
        const bounds = L.latLngBounds(coords.map(({ ll }) => [ll.lat, ll.lng]));
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [projects, map]);
  return null;
}

function MoveTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) map.setView([lat, lng], 14);
  }, [lat, lng, map]);
  return null;
}

interface ProjectMapProps {
  projects: Project[];
  height?: string;
  interactive?: boolean;
}

export function ProjectMap({ projects, height = "400px", interactive = true }: ProjectMapProps) {
  const defaultCenter: [number, number] = [36.8065, 10.1815]; // Tunis default
  const tunisiaBounds: [[number, number], [number, number]] = [[30.2, 7.524], [37.6, 11.6]];
  const validProjects = projects.filter(p => parseLatLng(p.latitude, p.longitude) !== null);
  const first = validProjects[0] ? parseLatLng(validProjects[0].latitude, validProjects[0].longitude) : null;
  const center = first ? ([first.lat, first.lng] as [number, number]) : defaultCenter;

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border border-border/50 relative z-0" style={{ height }}>
      <MapContainer
        center={center}
        zoom={validProjects.length === 1 ? 14 : 6}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        maxBounds={tunisiaBounds}
        maxBoundsViscosity={0.8}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {validProjects.length > 1 && <MapBounds projects={validProjects} />}

        {validProjects.map((project) => {
          const ll = parseLatLng(project.latitude, project.longitude);
          if (!ll) return null;
          return (
            <Marker
              key={project.id}
              position={[ll.lat, ll.lng]}
              icon={createCustomIcon(project.status)}
            >
              <Popup>
                <div className="p-1 min-w-[180px]">
                  <h3 className="font-bold text-sm mb-1">{project.name}</h3>
                  <p className="text-xs text-gray-500 mb-2">{project.client}</p>
                  <Link
                    href={`/projects/${project.id}`}
                    className="block w-full text-center bg-blue-600 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

/** Lightweight map preview used in forms – shows a single draggable pin */
export function MapPreview({ lat, lng, height = "200px" }: { lat: number; lng: number; height?: string }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return (
    <div className="rounded-xl overflow-hidden border border-border/50 relative z-0" style={{ height }}>
      <MapContainer
        center={[lat, lng]}
        zoom={13}
        scrollWheelZoom={false}
        zoomControl={false}
        dragging={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution=""
        />
        <MoveTo lat={lat} lng={lng} />
        <Marker position={[lat, lng]} icon={previewIcon} />
      </MapContainer>
    </div>
  );
}
