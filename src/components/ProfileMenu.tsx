import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/queries";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ProfileMenu() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const { data: profile } = useQuery({ ...profileQuery, retry: false });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const metadata = user?.user_metadata ?? {};
  const name = profile?.display_name || metadata.full_name || metadata.name || user?.email?.split("@")[0] || "Account";
  const email = user?.email;
  const avatarUrl = metadata.avatar_url || metadata.picture;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join("")
    .toUpperCase();

  const logout = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  return (
    <div className="mb-3 flex justify-end sm:mb-5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Open profile menu"
            className="flex items-center gap-2 rounded-full border border-border/80 bg-surface px-1.5 py-1.5 shadow-soft transition-colors hover:bg-secondary sm:gap-2.5 sm:pl-2"
          >
            <Avatar className="h-8 w-8 border border-primary/10 sm:h-9 sm:w-9">
              {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
              <AvatarFallback className="bg-primary/12 text-[10px] font-bold text-primary sm:text-xs">{initials || "PS"}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-36 truncate text-sm font-medium sm:inline">{name}</span>
            <ChevronDown className="mr-1 hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-xl p-1.5 shadow-lift">
          <DropdownMenuLabel className="px-2 py-2">
            <span className="block truncate text-sm font-semibold">{name}</span>
            {email && <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">{email}</span>}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => router.navigate({ to: "/settings" })} className="rounded-lg px-2.5 py-2">
            <Settings className="h-4 w-4" /> Settings
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={logout} className="rounded-lg px-2.5 py-2 text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
