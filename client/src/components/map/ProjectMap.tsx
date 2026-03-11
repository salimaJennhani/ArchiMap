import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { type Project } from '@shared/routes';
import { Link } from 'wouter';
import { Building2, MapPin } from 'lucide-react';

// Fix Leaflet's default icon paths in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icon for projects
const createCustomIcon = (status: string) => {
  const color = status === 'active' ? '#22c55e' : status === 'completed' ? '#3b82f6' : '#f59e0b';
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

function MapBounds({ projects }: { projects: Project[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (projects.length > 0) {
      const bounds = L.latLngBounds(projects.map(p => [Number(p.latitude), Number(p.longitude)]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [projects, map]);

  return null;
}

interface ProjectMapProps {
  projects: Project[];
  height?: string;
  interactive?: boolean;
}

export function ProjectMap({ projects, height = "400px", interactive = true }: ProjectMapProps) {
  // Default center (e.g., geographic center of US if no projects)
  const defaultCenter: [number, number] = [39.8283, -98.5795];
  const center = projects.length === 1 
    ? [Number(projects[0].latitude), Number(projects[0].longitude)] as [number, number]
    : defaultCenter;

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border border-border/50 relative z-0" style={{ height }}>
      <MapContainer 
        center={center} 
        zoom={projects.length === 1 ? 14 : 4} 
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" // Clean modern basemap
        />
        
        {projects.length > 1 && <MapBounds projects={projects} />}

        {projects.map((project) => (
          <Marker 
            key={project.id} 
            position={[Number(project.latitude), Number(project.longitude)]}
            icon={createCustomIcon(project.status)}
          >
            <Popup className="rounded-xl">
              <div className="p-1 min-w-[200px]">
                <h3 className="font-bold text-base mb-1" style={{ fontFamily: 'var(--font-display)' }}>{project.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{project.client}</p>
                <Link href={`/projects/${project.id}`} 
                  className="block w-full text-center bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  View Details
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
