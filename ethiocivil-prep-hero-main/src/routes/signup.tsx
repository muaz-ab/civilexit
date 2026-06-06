import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [university, setUniversity] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo: redirectTo },
    });
    if (error) { setBusy(false); return toast.error(error.message); }
    // Persist university to profile (best-effort)
    if (data.user && university) {
      await supabase.from("profiles").update({ university, name }).eq("id", data.user.id);
    }
    setBusy(false);
    toast.success("Account created!");
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
          <h1 className="font-display text-5xl leading-tight">Your <span className="text-gold">study plan</span>,<br/>days to exam day.</h1>
          <p className="mt-4 text-primary-foreground/80 max-w-md">Track mastery across 13 courses, simulate the real exam, and turn weak topics into wins.</p>
        </div>
        <div className="relative text-xs text-primary-foreground/60">Built for AAU, AAiT, ASTU & all Ethiopian engineering schools</div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <div>
            <h2 className="font-display text-3xl">Create your account</h2>
            <p className="text-sm text-muted-foreground mt-1">Free. Saves your progress across devices.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Full name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-background" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">University</label>
            <input value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="e.g. Addis Ababa University" className="w-full px-3 py-2 rounded-md border border-input bg-background" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-background" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-background" />
          </div>
          <button disabled={busy} className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-medium hover:bg-secondary disabled:opacity-50">
            {busy ? "Creating…" : "Create account"}
          </button>
          <p className="text-sm text-muted-foreground text-center">
            Already have an account? <Link to="/login" className="text-primary font-medium underline-offset-4 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
