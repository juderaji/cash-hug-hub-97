import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { LayoutDashboard, Wallet, ArrowLeftRight, PieChart, Calendar, ShoppingCart, ListChecks, Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/accounts", label: "Accounts", icon: Wallet },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/budgets", label: "Budgets", icon: PieChart },
  { to: "/planned", label: "Planned", icon: ListChecks },
  { to: "/shopping", label: "Shopping", icon: ShoppingCart },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppSidebar() {
  const loc = useLocation();
  const router = useRouter();
  const logout = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2 font-display font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">F</span>
          Finlo
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((it) => {
          const active = loc.pathname === it.to || (it.to !== "/app" && loc.pathname.startsWith(it.to));
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-primary text-primary-foreground font-medium shadow-soft"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const loc = useLocation();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-border bg-sidebar grid grid-cols-5">
      {navItems.slice(0, 5).map((it) => {
        const active = loc.pathname === it.to || (it.to !== "/app" && loc.pathname.startsWith(it.to));
        return (
          <Link key={it.to} to={it.to} className={`flex flex-col items-center gap-1 py-2 text-[10px] ${active ? "text-primary" : "text-muted-foreground"}`}>
            <it.icon className="h-5 w-5" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
