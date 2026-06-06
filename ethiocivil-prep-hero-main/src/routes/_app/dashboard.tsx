import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Countdown } from "@/components/Countdown";
import { readinessLabel } from "@/lib/exam";
import { Flame, Target, TrendingUp, Dumbbell, Timer, CalendarCheck2 } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user } = useAuth();

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_course_progress").select("*").eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  const { data: streak } = useQuery({
    queryKey: ["streak", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_streaks").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const overallScore = (() => {
    if (!courses.length) return 0;
    const totalWeight = courses.reduce((s: number, c: any) => s + Number(c.weight), 0);
    const weighted = courses.reduce((s: number, c: any) => {
      const p = progress.find((x: any) => x.course_id === c.id);
      return s + (Number(p?.mastery ?? 0)) * Number(c.weight);
    }, 0);
    return Math.round(weighted / totalWeight);
  })();

  const readiness = readinessLabel(overallScore);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl">Good {greet()}, <span className="text-primary">{user?.user_metadata?.name || user?.email?.split("@")[0]}</span></h1>
        <p className="text-muted-foreground mt-1">Here's where you stand today.</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><Countdown /></div>
        <div className="rounded-xl bg-card border p-6 flex flex-col justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Predicted Readiness</div>
            <div className={`font-display text-4xl mt-2 ${readiness.tone}`}>{readiness.label}</div>
            <div className="text-sm text-muted-foreground mt-1">Weighted across all 13 courses</div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground"><span>Overall score</span><span>{overallScore}%</span></div>
            <div className="h-2 bg-muted rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-gold transition-all" style={{ width: `${overallScore}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat icon={Flame} label="Study streak" value={`${streak?.current_streak ?? 0} days`} sub={`Longest ${streak?.longest_streak ?? 0}`} />
        <Stat icon={Target} label="Questions practiced" value={progress.reduce((s: number, p: any) => s + p.questions_attempted, 0).toString()} sub="across all courses" />
        <Stat icon={TrendingUp} label="Accuracy" value={accuracy(progress) + "%"} sub="lifetime" />
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <QuickAction to="/practice" icon={Dumbbell} label="Practice Now" tone="primary" />
        <QuickAction to="/mock-exam" icon={Timer} label="Mock Exam" tone="gold" />
        <QuickAction to="/study-plan" icon={CalendarCheck2} label="Study Plan" tone="secondary" />
      </div>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display text-2xl">Progress per course</h2>
          <Link to="/courses" className="text-sm text-primary hover:underline">All courses →</Link>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {courses.map((c: any) => {
            const p = progress.find((x: any) => x.course_id === c.id);
            const mastery = Math.round(Number(p?.mastery ?? 0));
            return (
              <Link key={c.id} to="/courses/$slug" params={{ slug: c.slug }}
                className="block rounded-lg border bg-card p-4 hover:border-gold transition-colors">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{p?.questions_attempted ?? 0} questions · weight {Number(c.weight).toFixed(1)}×</div>
                  </div>
                  <div className="text-sm tabular-nums font-medium">{mastery}%</div>
                </div>
                <div className="h-1.5 bg-muted rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${mastery}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function greet() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}

function accuracy(progress: any[]) {
  const attempted = progress.reduce((s, p) => s + p.questions_attempted, 0);
  const correct = progress.reduce((s, p) => s + p.questions_correct, 0);
  return attempted ? Math.round((correct / attempted) * 100) : 0;
}

function Stat({ icon: Icon, label, value, sub }: any) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
        <Icon className="w-4 h-4" /> {label}
      </div>
      <div className="font-display text-3xl mt-2">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, tone }: any) {
  const cls =
    tone === "primary" ? "bg-primary text-primary-foreground hover:bg-secondary"
    : tone === "gold" ? "bg-gold text-gold-foreground hover:opacity-90"
    : "bg-secondary text-secondary-foreground hover:bg-primary";
  return (
    <Link to={to} className={`rounded-lg p-5 flex items-center gap-3 transition-colors ${cls}`}>
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </Link>
  );
}
