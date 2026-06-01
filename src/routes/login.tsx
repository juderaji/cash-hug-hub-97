import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Finlo" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/app" });
    });
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/app" });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
  };

  const onGoogle = async () => {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/app" });
    if (res.error) toast.error("Google sign-in failed");
  };

  return <AuthShell title="Welcome back" subtitle="Sign in to your Finlo account">
    <button onClick={onGoogle} className="w-full rounded-lg border border-border bg-surface py-2.5 font-medium hover:bg-surface-muted flex items-center justify-center gap-2">
      <GoogleIcon /> Continue with Google
    </button>
    <Divider />
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Email"><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="auth-input" /></Field>
      <Field label="Password"><input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="auth-input" /></Field>
      <button disabled={loading} className="w-full rounded-lg bg-primary py-2.5 text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50">
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
    <p className="text-center text-sm text-muted-foreground">
      No account? <Link to="/signup" className="text-primary font-medium">Create one</Link>
    </p>
  </AuthShell>;
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold justify-center mb-8">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">F</span>
          Finlo
        </Link>
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-lift">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          <div className="mt-6 space-y-4">{children}</div>
        </div>
      </div>
      <style>{`.auth-input{width:100%;border:1px solid var(--border);background:var(--surface);border-radius:8px;padding:.6rem .75rem;font-size:.9rem;outline:none}.auth-input:focus{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-soft)}`}</style>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</span>{children}</label>;
}
export function Divider() { return <div className="flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" /></div>; }
export function GoogleIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>;
}
