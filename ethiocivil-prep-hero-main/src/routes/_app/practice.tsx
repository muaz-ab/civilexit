import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Check, X, Bookmark, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_app/practice")({
  validateSearch: (s: Record<string, unknown>) => ({ course: (s.course as string) || "" }),
  component: Practice,
});

function Practice() {
  const { user } = useAuth();
  const { course: courseSlug } = Route.useSearch();
  const [useTimer, setUseTimer] = useState(false);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => (await supabase.from("courses").select("*").order("sort_order")).data ?? [],
  });

  const courseId = useMemo(() => courses.find((c: any) => c.slug === courseSlug)?.id, [courses, courseSlug]);

  const { data: questions = [], refetch } = useQuery({
    queryKey: ["practice-questions", courseId || "all"],
    enabled: !!courses.length,
    queryFn: async () => {
      let q = supabase.from("questions").select("*").limit(50);
      if (courseId) q = q.eq("course_id", courseId);
      const { data } = await q;
      // shuffle
      return (data ?? []).sort(() => Math.random() - 0.5);
    },
  });

  useEffect(() => { setIdx(0); setSelected(null); setRevealed(false); setStartTime(Date.now()); }, [courseId, questions.length]);
  useEffect(() => {
    if (!useTimer || revealed) return;
    const i = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(i);
  }, [useTimer, revealed, startTime]);

  const q = questions[idx];

  async function submit(answer: string) {
    if (revealed || !q || !user) return;
    setSelected(answer);
    setRevealed(true);
    const timeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const isCorrect = answer === q.correct_answer;

    await supabase.from("user_question_attempts").insert({
      user_id: user.id, question_id: q.id, course_id: q.course_id,
      selected_answer: answer, is_correct: isCorrect, time_seconds: timeSeconds,
    });
    await updateProgress(user.id, q.course_id);
    await updateStreak(user.id);
  }

  async function mark(m: "easy" | "hard" | "review") {
    if (!q || !user) return;
    await supabase.from("user_question_attempts").insert({
      user_id: user.id, question_id: q.id, course_id: q.course_id, mark: m, is_correct: false,
    });
    toast.success(`Marked as ${m}`);
  }

  function next() {
    setSelected(null); setRevealed(false); setStartTime(Date.now()); setElapsed(0);
    if (idx + 1 >= questions.length) refetch().then(() => setIdx(0));
    else setIdx(idx + 1);
  }

  if (!q) return (
    <div className="text-center py-20">
      <h2 className="font-display text-2xl">No questions yet</h2>
      <p className="text-muted-foreground mt-2">Add some via the <Link to="/question-bank" className="text-primary underline">Question Bank</Link>.</p>
    </div>
  );

  const opts: [string, string][] = [["A", q.option_a], ["B", q.option_b], ["C", q.option_c], ["D", q.option_d]];

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Practice</h1>
          <p className="text-sm text-muted-foreground">{courseSlug ? courses.find((c: any) => c.slug === courseSlug)?.name : "All courses"} · Question {idx + 1} / {questions.length}</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={useTimer} onChange={(e) => setUseTimer(e.target.checked)} />
          Timer {useTimer && <span className="tabular-nums text-gold">{elapsed}s</span>}
        </label>
      </header>

      <div className="rounded-xl bg-card border p-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex gap-2">
          {q.topic && <span className="px-2 py-0.5 rounded bg-muted">{q.topic}</span>}
          <span className="px-2 py-0.5 rounded bg-muted">{q.difficulty}</span>
          {q.year && <span className="px-2 py-0.5 rounded bg-muted">{q.year}</span>}
        </div>
        <div className="text-lg font-medium leading-snug">{q.question_text}</div>

        <div className="mt-5 space-y-2">
          {opts.map(([k, v]) => {
            const isCorrect = revealed && k === q.correct_answer;
            const isWrong = revealed && k === selected && k !== q.correct_answer;
            return (
              <button key={k} onClick={() => submit(k)} disabled={revealed}
                className={`w-full text-left px-4 py-3 rounded-md border transition-colors flex items-center gap-3
                  ${isCorrect ? "border-success bg-success/10" :
                    isWrong ? "border-destructive bg-destructive/10" :
                    "hover:border-gold hover:bg-accent/40"}`}>
                <span className="w-7 h-7 rounded-full border grid place-items-center text-sm font-medium">{k}</span>
                <span className="flex-1">{v}</span>
                {isCorrect && <Check className="w-4 h-4 text-success" />}
                {isWrong && <X className="w-4 h-4 text-destructive" />}
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className="mt-5 p-4 rounded-md bg-muted/50 border">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Explanation</div>
            <div className="text-sm">{q.explanation || "No explanation provided. Add one when creating the question."}</div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => mark("easy")} className="text-xs px-3 py-1.5 rounded-md border hover:bg-accent">Easy</button>
          <button onClick={() => mark("hard")} className="text-xs px-3 py-1.5 rounded-md border hover:bg-accent">Hard</button>
          <button onClick={() => mark("review")} className="text-xs px-3 py-1.5 rounded-md border hover:bg-accent inline-flex items-center gap-1"><Bookmark className="w-3 h-3" /> Review later</button>
          <button onClick={next} disabled={!revealed}
            className="ml-auto text-sm px-4 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-40 inline-flex items-center gap-1">
            Next <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

async function updateProgress(userId: string, courseId: string) {
  const { data: attempts } = await supabase.from("user_question_attempts")
    .select("is_correct").eq("user_id", userId).eq("course_id", courseId).not("selected_answer", "is", null);
  const attempted = attempts?.length ?? 0;
  const correct = attempts?.filter((a) => a.is_correct).length ?? 0;
  const mastery = attempted ? (correct / attempted) * 100 : 0;
  await supabase.from("user_course_progress").upsert({
    user_id: userId, course_id: courseId,
    questions_attempted: attempted, questions_correct: correct, mastery, last_practiced: new Date().toISOString(),
  });
}

async function updateStreak(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase.from("user_streaks").select("*").eq("user_id", userId).maybeSingle();
  if (!data) {
    await supabase.from("user_streaks").insert({ user_id: userId, current_streak: 1, longest_streak: 1, last_study_date: today });
    return;
  }
  if (data.last_study_date === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newCurrent = data.last_study_date === yesterday ? data.current_streak + 1 : 1;
  const newLongest = Math.max(data.longest_streak, newCurrent);
  await supabase.from("user_streaks").update({ current_streak: newCurrent, longest_streak: newLongest, last_study_date: today }).eq("user_id", userId);
}
