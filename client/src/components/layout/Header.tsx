import { useState, useRef, useEffect } from "react";
import { Menu, Bell, Calendar, MapPin, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { useUpcomingVisits } from "@/hooks/use-visits";
import { Link } from "wouter";
import { differenceInDays, format, isToday, isTomorrow } from "date-fns";

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { data: upcoming, isLoading } = useUpcomingVisits();

  const getDayLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return { label: "Today", color: "text-red-600 dark:text-red-400", dot: "bg-red-500" };
    if (isTomorrow(d)) return { label: "Tomorrow", color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" };
    const days = differenceInDays(d, new Date());
    return { label: `In ${days} day${days !== 1 ? "s" : ""}`, color: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" };
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-background border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="font-bold text-sm">Upcoming Visits</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
        ) : !upcoming?.length ? (
          <div className="p-8 text-center">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">No upcoming visits scheduled.</p>
          </div>
        ) : (
          upcoming.map((v) => {
            const { label, color, dot } = getDayLabel(v.visitDate);
            return (
              <Link
                key={v.visitId}
                href={`/projects/${v.projectId}`}
                onClick={onClose}
                className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0"
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{v.projectName}</p>
                    <span className={`text-xs font-medium shrink-0 ${color}`}>{label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{format(new Date(v.visitDate), "EEEE, MMM d")}</p>
                  {v.progressStatus && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" /> {v.progressStatus}
                    </p>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
      <div className="px-4 py-3 border-t border-border bg-muted/20">
        <Link href="/projects" onClick={onClose} className="text-xs text-primary font-medium hover:underline">
          View all projects →
        </Link>
      </div>
    </div>
  );
}

export function Header() {
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: upcoming } = useUpcomingVisits();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const count = upcoming?.length ?? 0;

  return (
    <header className="h-16 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <button className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
              <Menu className="w-6 h-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-sidebar border-none">
            <Sidebar />
          </SheetContent>
        </Sheet>
        <span className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>BuildTrack</span>
      </div>

      <div className="hidden md:flex flex-1" />

      <div className="flex items-center gap-3" ref={ref}>
        <div className="relative">
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-background">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>
          {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
        </div>
      </div>
    </header>
  );
}
