import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  BookOpen,
  Dumbbell,
  Timer,
  CalendarCheck2,
  BarChart3,
  Database,
  LogOut,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/courses", label: "Courses", icon: BookOpen },
  { to: "/practice", label: "Practice", icon: Dumbbell },
  { to: "/mock-exam", label: "Mock Exam", icon: Timer },
  { to: "/study-plan", label: "Study Plan", icon: CalendarCheck2 },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/question-bank", label: "Question Bank", icon: Database },
];

export function AppShell() {
  const { pathname } = useRouterState({ select: (s) => s.location });
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="px-6 py-6 flex items-center gap-3 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-md bg-gold text-gold-foreground grid place-items-center">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="font-display text-lg leading-tight">Civil Exit</div>
            <div className="text-xs text-sidebar-foreground/70">Exam Prep · ETH</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((n) => {
            const active = pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border text-xs">
          <div className="px-3 py-2 truncate text-sidebar-foreground/70">{user?.email}</div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/90"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-gold" />
            <span className="font-display">Civil Exit</span>
          </div>
          <button onClick={signOut} className="text-xs flex items-center gap-1"><LogOut className="w-4 h-4" /></button>
        </div>
        <div className="flex overflow-x-auto gap-1 px-2 pb-2 no-scrollbar">
          {nav.map((n) => {
            const active = pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs whitespace-nowrap",
                  active ? "bg-gold text-gold-foreground" : "bg-sidebar-accent/40"
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </div>
      </div>

      <main className="flex-1 md:pt-0 pt-28 min-w-0">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
