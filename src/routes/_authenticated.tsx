import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar, MobileNav } from "@/components/AppSidebar";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <div className="mx-auto max-w-6xl px-4 md:px-8 py-6 md:py-10">
          <Outlet />
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
