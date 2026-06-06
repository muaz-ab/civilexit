import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { daysUntilExam } from "@/lib/exam";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/study-plan")({ component: StudyPlan });

function StudyPlan() {
  const { user } = useAuth();
  const days = daysUntilExam();

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => (await supabase.from("courses").select("*").order("sort_order")).data ?? [],
  });
  const { data: progress = [] } = useQuery({
    queryKey: ["progress", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("user_course_progress").select("*").eq("user_id", user!.id)).data ?? [],
  });
  const { data: plan = [], refetch } = useQuery({
    queryKey: ["plan", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("study_plan_days").select("*").eq("user_id", user!.id).order("plan_date")).data ?? [],
  });

  async function generate() {
    if (!user || !courses.length) return;
    // Score courses: lower mastery + higher weight = higher priority
    const ranked = courses.map((c: any) => {
      const p = progress.find((x: any) => x.course_id === c.id);
      const mastery = Number(p?.mastery ?? 0);
      const priority = (100 - mastery) * Number(c.weight);
      return { ...c, mastery, priority };
    }).sort((a, b) => b.priority - a.priority);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const plans: any[] = [];
    const total = Math.min(days, 60);
    for (let d = 0; d < total; d++) {
      const date = new Date(today.getTime() + d * 86400000);
      const c = ranked[d % ranked.length];
      plans.push({
        user_id: user.id,
        plan_date: date.toISOString().slice(0, 10),
        tasks: [
          { type: "study", course: c.name, course_slug: c.slug, label: `Focus: ${c.name}` },
          { type: "practice", course: c.name, course_slug: c.slug, count: 15, label: `15 practice questions` },
        ],
        completed: false,
      });
    }
    await supabase.from("study_plan_days").delete().eq("user_id", user.id);
    const { error } = await supabase.from("study_plan_days").insert(plans);
    if (error) return toast.error(error.message);
    toast.success(`Generated a ${total}-day plan`);
    refetch();
  }

  async function toggleDay(d: any) {
    await supabase.from("study_plan_days").update({ completed: !d.completed }).eq("id", d.id);
    refetch();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Study Plan</h1>
          <p className="text-muted-foreground mt-1">{days} days until exit exam. Plan rebuilt from your weak areas.</p>
        </div>
        <button onClick={generate} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:bg-secondary">
          {plan.length ? "Regenerate plan" : "Generate plan"}
        </button>
      </header>

      {!plan.length && (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          <CalendarDays className="w-10 h-10 mx-auto text-gold" />
          <p className="mt-3">No plan yet — click <b>Generate plan</b> to build one based on your progress.</p>
        </div>
      )}

      <div className="space-y-2">
        {plan.map((d: any) => {
          const isToday = d.plan_date === new Date().toISOString().slice(0, 10);
          return (
            <div key={d.id} className={`rounded-lg border p-4 flex items-start gap-3 ${isToday ? "bg-gold/10 border-gold" : "bg-card"}`}>
              <button onClick={() => toggleDay(d)} className={`w-6 h-6 rounded-full border-2 grid place-items-center mt-0.5 ${d.completed ? "bg-success border-success text-white" : "border-muted-foreground"}`}>
                {d.completed && <CheckCircle2 className="w-4 h-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between">
                  <div className="text-sm font-medium">{new Date(d.plan_date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</div>
                  {isToday && <span className="text-xs uppercase tracking-wider text-gold font-medium">Today</span>}
                </div>
                <ul className="mt-1 text-sm text-muted-foreground space-y-0.5">
                  {(d.tasks as any[]).map((t, i) => <li key={i}>· {t.label}</li>)}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
