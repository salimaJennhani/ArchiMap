import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Briefcase, 
  Files,
  LogOut,
  Building2
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function Sidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: Briefcase },
    { href: "/map", label: "Map View", icon: MapIcon },
  ];

  return (
    <aside className="w-64 bg-sidebar hidden md:flex flex-col border-r border-sidebar-border h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3 border-b border-sidebar-border/50">
        <div className="bg-primary/20 p-2 rounded-lg text-primary">
          <Building2 className="w-6 h-6" />
        </div>
        <span className="text-xl font-bold tracking-tight text-sidebar-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          BuildTrack
        </span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} 
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                ${isActive 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 font-medium" 
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }
              `}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-primary-foreground" : ""}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border/50">
        <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-sidebar-accent/50">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : "User"}
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
