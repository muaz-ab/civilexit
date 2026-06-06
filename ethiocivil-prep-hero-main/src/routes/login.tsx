import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between bg-primary text-primary-foreground p-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-40" style={{ background: "radial-gradient(circle at 30% 80%, var(--gold), transparent 60%)" }} />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-gold text-gold-foreground grid place-items-center"><GraduationCap className="w-5 h-5" /></div>
          <span className="font-display text-xl">Civil Exit</span>
        </div>
        <div className="relative">
          <h1 className="font-display text-5xl leading-tight">Ace the<br/><span className="text-gold">Civil Engineering</span><br/>Exit Exam.</h1>
          <p className="mt-4 text-primary-foreground/80 max-w-md">Built for Ethiopian universities. 13 courses, past AAU exam questions, AI-generated practice, and a study plan tuned to your weak areas.</p>
        </div>
        <div className="relative text-xs text-primary-foreground/60">June 12, 2026 · Addis Ababa</div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="font-display text-3xl">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">Sign in to continue your prep.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background" />
          </div>
          <button disabled={busy} className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-medium hover:bg-secondary transition-colors disabled:opacity-50">
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-sm text-muted-foreground text-center">
            New here? <Link to="/signup" className="text-primary font-medium underline-offset-4 hover:underline">Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
