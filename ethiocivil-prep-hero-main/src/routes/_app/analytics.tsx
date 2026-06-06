import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_app/analytics")({ component: Analytics });

function Analytics() {
  const { user } = useAuth();

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => (await supabase.from("courses").select("*").order("sort_order")).data ?? [],
  });
  const { data: progress = [] } = useQuery({
    queryKey: ["progress", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("user_course_progress").select("*").eq("user_id", user!.id)).data ?? [],
  });
  const { data: attempts = [] } = useQuery({
    queryKey: ["attempts", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("user_question_attempts").select("*").eq("user_id", user!.id).order("attempted_at")).data ?? [],
  });
  const { data: mocks = [] } = useQuery({
    queryKey: ["mocks", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("mock_exams").select("*").eq("user_id", user!.id).order("taken_at")).data ?? [],
  });

  // Improvement chart: rolling accuracy by day
  const byDate: Record<string, { date: string; correct: number; total: number }> = {};
  attempts.filter((a: any) => a.selected_answer).forEach((a: any) => {
    const d = (a.attempted_at as string).slice(0, 10);
    if (!byDate[d]) byDate[d] = { date: d, correct: 0, total: 0 };
    byDate[d].total++;
    if (a.is_correct) byDate[d].correct++;
  });
  const chartData = Object.values(byDate).map((d) => ({ date: d.date.slice(5), accuracy: Math.round((d.correct / d.total) * 100) }));

  // Focus areas: lowest mastery × weight
  const focus = courses.map((c: any) => {
    const p = progress.find((x: any) => x.course_id === c.id);
    const mastery = Number(p?.mastery ?? 0);
    return { ...c, mastery, gap: (100 - mastery) * Number(c.weight) };
  }).sort((a, b) => b.gap - a.gap).slice(0, 5);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl">Analytics</h1>
        <p className="text-muted-foreground mt-1">Where you've been and what needs urgent attention.</p>
      </header>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-display text-xl mb-3">Improvement over time</h2>
        {chartData.length < 2 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Practice more to see your trend.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 50% / 0.2)" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis domain={[0, 100]} fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="accuracy" stroke="var(--gold)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-display text-xl mb-3 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-warning" /> Focus areas</h2>
          <ul className="space-y-2">
            {focus.map((c: any) => (
              <li key={c.id} className="flex justify-between items-center text-sm">
                <span>{c.name}</span>
                <span className="text-muted-foreground tabular-nums">{Math.round(c.mastery)}%</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-display text-xl mb-3">Mock exam history</h2>
          {!mocks.length ? <p className="text-sm text-muted-foreground">No mock exams yet.</p> : (
            <ul className="space-y-2 text-sm">
              {mocks.slice(-5).reverse().map((m: any) => (
                <li key={m.id} className="flex justify-between">
                  <span>{new Date(m.taken_at).toLocaleDateString()}</span>
                  <span className="font-medium tabular-nums">{m.score}% · {m.correct_count}/{m.total_questions}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
