import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Timer as TimerIcon, Trophy } from "lucide-react";

const MOCK_MINUTES = 180;
const MOCK_QUESTIONS = 50;

export const Route = createFileRoute("/_app/mock-exam")({ component: MockExam });

function MockExam() {
  const { user } = useAuth();
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(MOCK_MINUTES * 60);
  const [result, setResult] = useState<any>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => (await supabase.from("courses").select("*").order("sort_order")).data ?? [],
  });

  useEffect(() => {
    if (!started || finished) return;
    const i = setInterval(() => {
      const left = MOCK_MINUTES * 60 - Math.floor((Date.now() - startTime) / 1000);
      setSecondsLeft(Math.max(0, left));
      if (left <= 0) finish();
    }, 1000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, finished, startTime]);

  async function start() {
    if (!courses.length) return;
    // weighted sample: pull questions and oversample by course weight
    const all: any[] = [];
    for (const c of courses) {
      const target = Math.max(1, Math.round((MOCK_QUESTIONS * Number(c.weight)) / courses.reduce((s: number, x: any) => s + Number(x.weight), 0)));
      const { data } = await supabase.from("questions").select("*").eq("course_id", c.id).limit(50);
      const shuffled = (data ?? []).sort(() => Math.random() - 0.5).slice(0, target);
      all.push(...shuffled);
    }
    if (all.length < 5) return toast.error("Not enough questions yet. Add more in the Question Bank.");
    setQuestions(all.sort(() => Math.random() - 0.5));
    setStarted(true);
    setStartTime(Date.now());
    setSecondsLeft(MOCK_MINUTES * 60);
  }

  async function finish() {
    setFinished(true);
    const correctCount = questions.filter((q) => answers[q.id] === q.correct_answer).length;
    const score = Math.round((correctCount / questions.length) * 100);
    const breakdown: Record<string, { total: number; correct: number; name: string }> = {};
    for (const q of questions) {
      const c = courses.find((x: any) => x.id === q.course_id);
      const key = c?.slug ?? "unknown";
      if (!breakdown[key]) breakdown[key] = { total: 0, correct: 0, name: c?.name ?? "Unknown" };
      breakdown[key].total++;
      if (answers[q.id] === q.correct_answer) breakdown[key].correct++;
    }
    const duration = Math.floor((Date.now() - startTime) / 1000);
    setResult({ correctCount, score, breakdown, duration });
    if (user) {
      await supabase.from("mock_exams").insert({
        user_id: user.id, duration_seconds: duration,
        total_questions: questions.length, correct_count: correctCount, score, breakdown,
      });
      // record attempts
      const attempts = questions.map((q) => ({
        user_id: user.id, question_id: q.id, course_id: q.course_id,
        selected_answer: answers[q.id] || null, is_correct: answers[q.id] === q.correct_answer,
      }));
      await supabase.from("user_question_attempts").insert(attempts);
    }
  }

  if (!started) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 space-y-5">
        <div className="w-16 h-16 rounded-full bg-gold/15 text-gold grid place-items-center mx-auto"><TimerIcon className="w-8 h-8" /></div>
        <h1 className="font-display text-4xl">Mock Exam</h1>
        <p className="text-muted-foreground">~{MOCK_QUESTIONS} questions · 180 minutes · weighted across all 13 courses, just like the real exit exam.</p>
        <button onClick={start} className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-secondary">Begin mock exam</button>
      </div>
    );
  }

  if (finished && result) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gold text-gold-foreground grid place-items-center mx-auto"><Trophy className="w-8 h-8" /></div>
          <h1 className="font-display text-5xl mt-3">{result.score}%</h1>
          <p className="text-muted-foreground">{result.correctCount} of {questions.length} correct · {Math.floor(result.duration / 60)} min</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-display text-2xl mb-3">Breakdown by course</h2>
          <div className="space-y-2">
            {Object.values(result.breakdown).sort((a: any, b: any) => (a.correct / a.total) - (b.correct / b.total)).map((b: any) => {
              const pct = Math.round((b.correct / b.total) * 100);
              return (
                <div key={b.name}>
                  <div className="flex justify-between text-sm"><span>{b.name}</span><span className="tabular-nums">{b.correct}/{b.total} · {pct}%</span></div>
                  <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                    <div className={`h-full ${pct >= 70 ? "bg-success" : pct >= 50 ? "bg-gold" : "bg-destructive"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2 justify-center">
          <Link to="/dashboard" className="border px-4 py-2 rounded-md text-sm">Back to dashboard</Link>
          <button onClick={() => { setStarted(false); setFinished(false); setAnswers({}); setIdx(0); }} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm">Try another</button>
        </div>
      </div>
    );
  }

  const q = questions[idx];
  const mins = Math.floor(secondsLeft / 60), secs = secondsLeft % 60;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur py-2 z-10">
        <div className="text-sm">Question {idx + 1} / {questions.length}</div>
        <div className={`font-display text-2xl tabular-nums ${secondsLeft < 600 ? "text-destructive" : ""}`}>{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</div>
        <button onClick={finish} className="text-sm text-destructive hover:underline">Submit early</button>
      </div>
      <div className="rounded-xl bg-card border p-6">
        <div className="font-medium leading-snug">{q.question_text}</div>
        <div className="mt-4 space-y-2">
          {(["A", "B", "C", "D"] as const).map((k) => (
            <button key={k} onClick={() => setAnswers({ ...answers, [q.id]: k })}
              className={`w-full text-left px-4 py-3 rounded-md border flex items-center gap-3 ${answers[q.id] === k ? "border-gold bg-gold/10" : "hover:bg-accent/40"}`}>
              <span className="w-7 h-7 rounded-full border grid place-items-center text-sm">{k}</span>
              <span>{(q as any)[`option_${k.toLowerCase()}`]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-between">
        <button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0} className="border px-4 py-2 rounded-md text-sm disabled:opacity-30">Previous</button>
        {idx === questions.length - 1
          ? <button onClick={finish} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm">Finish exam</button>
          : <button onClick={() => setIdx(idx + 1)} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm">Next</button>}
      </div>
      <div className="flex flex-wrap gap-1">
        {questions.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            className={`w-7 h-7 rounded text-xs ${i === idx ? "bg-primary text-primary-foreground" : answers[questions[i].id] ? "bg-gold/30" : "bg-muted"}`}>
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
