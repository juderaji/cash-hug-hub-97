import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { AuthShell, Field, Divider, GoogleIcon } from "./login";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create your Finlo account" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/app" });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/app",
        data: { display_name: name },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. Check your email to verify.");
  };

  const onGoogle = async () => {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/app" });
    if (res.error) toast.error("Google sign-up failed");
  };

  return (
    <AuthShell title="Create your account" subtitle="Start your personal finance OS">
      <button onClick={onGoogle} className="w-full rounded-lg border border-border bg-surface py-2.5 font-medium hover:bg-surface-muted flex items-center justify-center gap-2">
        <GoogleIcon /> Continue with Google
      </button>
      <Divider />
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Name"><input required value={name} onChange={(e) => setName(e.target.value)} className="auth-input" /></Field>
        <Field label="Email"><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="auth-input" /></Field>
        <Field label="Password"><input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="auth-input" /></Field>
        <button disabled={loading} className="w-full rounded-lg bg-primary py-2.5 text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50">
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Have an account? <Link to="/login" className="text-primary font-medium">Sign in</Link>
      </p>
    </AuthShell>
  );
}
