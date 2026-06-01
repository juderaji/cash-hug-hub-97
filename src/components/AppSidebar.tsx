import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { LayoutDashboard, Wallet, ArrowLeftRight, PieChart, Calendar, ShoppingCart, ListChecks, Settings, LogOut, PiggyBank, Menu, X, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PocketsteadLogo, PocketsteadMark } from "@/components/PocketsteadLogo";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, type ReactElement } from "react";

const navItems = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/accounts", label: "Accounts", icon: Wallet },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/budgets", label: "Budgets", icon: PieChart },
  { to: "/savings", label: "Savings", icon: PiggyBank },
  { to: "/planned", label: "Planned", icon: ListChecks },
  { to: "/shopping", label: "Shopping", icon: ShoppingCart },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppSidebar() {
  const loc = useLocation();
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const logout = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };
  return (
    <TooltipProvider delayDuration={150}>
    <aside className={`hidden h-screen shrink-0 flex-col overflow-hidden bg-sidebar transition-[width] duration-300 md:flex ${expanded ? "w-56" : "w-20"}`}>
      <div className={`flex items-center px-3 py-5 ${expanded ? "justify-start" : "justify-center"}`}>
        <Link to="/" aria-label="Pocketstead home" className="font-display font-bold text-white">
          {expanded ? <PocketsteadLogo /> : <PocketsteadMark className="h-10 w-10 rounded-xl shadow-soft" />}
        </Link>
      </div>
      <nav className="min-h-0 flex-1 space-y-2 overflow-x-hidden overflow-y-auto px-3 py-2">
        {navItems.map((it) => {
          const active = loc.pathname === it.to || (it.to !== "/app" && loc.pathname.startsWith(it.to));
          return (
            <SidebarTooltip key={it.to} label={it.label} show={!expanded}>
              <Link
                to={it.to}
                aria-label={it.label}
                className={`flex h-11 items-center rounded-xl transition-colors ${expanded ? "w-full gap-3 px-3" : "w-14 justify-center"} ${
                  active
                    ? "bg-white/22 text-white shadow-soft"
                    : "text-white/70 hover:bg-white/12 hover:text-white"
                }`}
              >
                <it.icon className="h-4.5 w-4.5" />
                {expanded && <span className="ui-tech text-xs font-semibold uppercase">{it.label}</span>}
              </Link>
            </SidebarTooltip>
          );
        })}
      </nav>
      <div className="shrink-0 space-y-1 border-t border-white/10 px-3 py-4">
        <SidebarTooltip label={expanded ? "Collapse sidebar" : "Expand sidebar"} show={!expanded}>
          <button onClick={() => setExpanded((open) => !open)} aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"} className={`flex h-11 items-center rounded-xl text-white/65 hover:bg-white/12 hover:text-white ${expanded ? "w-full gap-3 px-3" : "w-14 justify-center"}`}>
            {expanded ? <PanelLeftClose className="h-4.5 w-4.5" /> : <PanelLeftOpen className="h-4.5 w-4.5" />}
            {expanded && <span className="ui-tech text-xs font-semibold uppercase">Minimize</span>}
          </button>
        </SidebarTooltip>
        <SidebarTooltip label="Sign out" show={!expanded}>
          <button onClick={logout} aria-label="Sign out" className={`flex h-11 items-center rounded-xl text-white/65 hover:bg-white/12 hover:text-white ${expanded ? "w-full gap-3 px-3" : "w-14 justify-center"}`}>
            <LogOut className="h-4.5 w-4.5" />
            {expanded && <span className="ui-tech text-xs font-semibold uppercase">Sign out</span>}
          </button>
        </SidebarTooltip>
      </div>
    </aside>
    </TooltipProvider>
  );
}

function SidebarTooltip({ label, show, children }: { label: string; show: boolean; children: ReactElement }) {
  if (!show) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>{label}</TooltipContent>
    </Tooltip>
  );
}

export function MobileNav() {
  const loc = useLocation();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const primaryItems = navItems.slice(0, 4);
  const moreItems = navItems.slice(4);
  const moreActive = moreItems.some((it) => loc.pathname === it.to || loc.pathname.startsWith(it.to));
  const logout = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };
  return (
    <>
      {moreOpen && (
        <>
          <button className="fixed inset-0 z-30 bg-foreground/30 md:hidden" aria-label="Close navigation menu" onClick={() => setMoreOpen(false)} />
          <div className="fixed inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 rounded-2xl border border-border bg-surface p-3 shadow-lift md:hidden">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">More</span>
              <button onClick={() => setMoreOpen(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-sidebar-accent" aria-label="Close menu"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {moreItems.map((it) => {
                const active = loc.pathname === it.to || loc.pathname.startsWith(it.to);
                return (
                  <Link key={it.to} to={it.to} onClick={() => setMoreOpen(false)} className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"}`}>
                    <it.icon className="h-4 w-4" /> {it.label}
                  </Link>
                );
              })}
            </div>
            <button onClick={logout} className="mt-2 flex w-full items-center gap-2 rounded-lg border-t border-border px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {primaryItems.map((it) => {
        const active = loc.pathname === it.to || (it.to !== "/app" && loc.pathname.startsWith(it.to));
        return (
          <Link key={it.to} to={it.to} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] ${active ? "text-primary" : "text-muted-foreground"}`}>
            <it.icon className="h-4.5 w-4.5" />
            {it.label}
          </Link>
        );
      })}
      <button onClick={() => setMoreOpen((open) => !open)} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] ${moreOpen || moreActive ? "text-primary" : "text-muted-foreground"}`}>
        <Menu className="h-4.5 w-4.5" /> More
      </button>
      </nav>
    </>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
      <div>
        <h1 className="text-xl font-bold uppercase tracking-[0.04em] sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm">{subtitle}</p>}
      </div>
      {action && <div className="w-full [&_.btn-primary]:w-full [&_.btn-primary]:justify-center sm:w-auto sm:[&_.btn-primary]:w-auto">{action}</div>}
    </div>
  );
}
