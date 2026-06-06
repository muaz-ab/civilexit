import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { parseBulkQuestions } from "@/lib/parse-questions";
import { Sparkles, Wand2, FileText, Plus, FileUp } from "lucide-react";
import { extractPdfText } from "@/lib/pdf-extract";

export const Route = createFileRoute("/_app/question-bank")({
  validateSearch: (s: Record<string, unknown>) => ({ course: (s.course as string) || "" }),
  component: QuestionBank,
});

function QuestionBank() {
  const { user } = useAuth();
  const { course: presetCourse } = Route.useSearch();
  const [tab, setTab] = useState<"bulk" | "ai" | "pdf" | "manual">("pdf");
  const [courseId, setCourseId] = useState("");
  const [topic, setTopic] = useState("");
  const [year, setYear] = useState("");
  const [source, setSource] = useState("");

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => (await supabase.from("courses").select("*").order("sort_order")).data ?? [],
  });

  // preselect
  if (!courseId && presetCourse && courses.length) {
    const c = courses.find((x: any) => x.slug === presetCourse);
    if (c) setCourseId(c.id);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-4xl">Question Bank</h1>
        <p className="text-muted-foreground mt-1">Add questions to your study set. They're shared with all students.</p>
      </header>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="grid sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Course</label>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-md border bg-background">
              <option value="">Select course…</option>
              {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Topic (optional)</label>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-md border bg-background" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Year / Source</label>
            <div className="flex gap-2 mt-1">
              <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2023" className="w-1/2 px-2 py-2 rounded-md border bg-background" />
              <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="AAU" className="w-1/2 px-2 py-2 rounded-md border bg-background" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-b flex-wrap">
          <TabBtn active={tab === "pdf"} onClick={() => setTab("pdf")} icon={FileUp} label="Upload PDF" />
          <TabBtn active={tab === "bulk"} onClick={() => setTab("bulk")} icon={FileText} label="Paste bulk" />
          <TabBtn active={tab === "ai"} onClick={() => setTab("ai")} icon={Sparkles} label="AI generate" />
          <TabBtn active={tab === "manual"} onClick={() => setTab("manual")} icon={Plus} label="Add one" />
        </div>

        {tab === "pdf" && <PdfUpload courses={courses} year={year} source={source} userId={user?.id} />}
        {tab === "bulk" && <BulkPaste courseId={courseId} topic={topic} year={year} source={source} userId={user?.id} />}
        {tab === "ai" && <AIGenerate courseId={courseId} topic={topic} year={year} source={source} userId={user?.id} />}
        {tab === "manual" && <ManualAdd courseId={courseId} topic={topic} year={year} source={source} userId={user?.id} />}
      </div>

      <Link to="/practice" className="text-sm text-primary hover:underline">Go practice →</Link>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: any) {
  return (
    <button onClick={onClick} className={`px-3 py-2 text-sm inline-flex items-center gap-2 border-b-2 -mb-px transition-colors ${active ? "border-gold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

function BulkPaste({ courseId, topic, year, source, userId }: any) {
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!courseId) return toast.error("Select a course first.");
    const parsed = parseBulkQuestions(raw);
    if (!parsed.length) return toast.error("Couldn't parse any questions. Check the format.");
    setBusy(true);
    const rows = parsed.map((p) => ({
      ...p, course_id: courseId, topic: topic || null, year: year ? parseInt(year) : null,
      source: source || null, created_by: userId, difficulty: "medium" as const,
    }));
    const { error } = await supabase.from("questions").insert(rows);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Added ${parsed.length} questions`);
    setRaw("");
  }

  return (
    <div className="space-y-3">
      <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={12}
        placeholder={`1. What is the standard cube size for concrete compressive test?\nA) 100mm  B) 150mm  C) 200mm  D) 250mm\nAnswer: B\n\n2. ...`}
        className="w-full p-3 rounded-md border bg-background font-mono text-sm" />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Format: "1. Question? A) … B) … C) … D) … Answer: B"</p>
        <button onClick={save} disabled={busy} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm disabled:opacity-50">
          {busy ? "Saving…" : `Parse & save`}
        </button>
      </div>
    </div>
  );
}

function AIGenerate({ courseId, topic, year, source, userId }: any) {
  const [text, setText] = useState("");
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (!courseId) return toast.error("Select a course first.");
    if (text.trim().length < 100) return toast.error("Paste at least a paragraph of notes/past-exam text.");
    setBusy(true);
    try {
      const res = await fetch("/api/public/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, count, topic }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "AI generation failed");
      }
      const { questions } = await res.json() as { questions: any[] };
      if (!questions?.length) throw new Error("No questions generated");
      const rows = questions.map((q) => ({
        course_id: courseId, topic: topic || q.topic || null, question_text: q.question_text,
        option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
        correct_answer: q.correct_answer, explanation: q.explanation, difficulty: q.difficulty || "medium",
        year: year ? parseInt(year) : null, source: source || "AI generated", created_by: userId,
      }));
      const { error } = await supabase.from("questions").insert(rows);
      if (error) throw error;
      toast.success(`Generated ${rows.length} questions`);
      setText("");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10}
        placeholder="Paste course notes, a textbook excerpt, or past exam text here…"
        className="w-full p-3 rounded-md border bg-background text-sm" />
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm">Questions to generate: <input type="number" min={1} max={15} value={count} onChange={(e) => setCount(parseInt(e.target.value) || 5)} className="w-16 ml-2 px-2 py-1 rounded border bg-background" /></label>
        <button onClick={generate} disabled={busy} className="inline-flex items-center gap-2 bg-gold text-gold-foreground px-4 py-2 rounded-md text-sm disabled:opacity-50">
          <Wand2 className="w-4 h-4" /> {busy ? "Generating…" : "Generate"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">Tip: PDFs aren't auto-parsed yet — copy the text and paste it here.</p>
    </div>
  );
}

function ManualAdd({ courseId, topic, year, source, userId }: any) {
  const [q, setQ] = useState({ question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A", explanation: "", difficulty: "medium" });
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!courseId) return toast.error("Select a course first.");
    if (!q.question_text || !q.option_a || !q.option_b || !q.option_c || !q.option_d) return toast.error("Fill all fields.");
    setBusy(true);
    const { error } = await supabase.from("questions").insert({
      ...q, correct_answer: q.correct_answer as any, difficulty: q.difficulty as any,
      course_id: courseId, topic: topic || null, year: year ? parseInt(year) : null,
      source: source || null, created_by: userId,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Question added");
    setQ({ question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A", explanation: "", difficulty: "medium" });
  }

  return (
    <div className="space-y-3">
      <textarea value={q.question_text} onChange={(e) => setQ({ ...q, question_text: e.target.value })} placeholder="Question text" rows={2} className="w-full p-3 rounded-md border bg-background" />
      <div className="grid sm:grid-cols-2 gap-2">
        {(["A", "B", "C", "D"] as const).map((k) => (
          <input key={k} value={(q as any)["option_" + k.toLowerCase()]}
            onChange={(e) => setQ({ ...q, [`option_${k.toLowerCase()}`]: e.target.value } as any)}
            placeholder={`Option ${k}`} className="px-3 py-2 rounded-md border bg-background" />
        ))}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-sm">Correct:
          <select value={q.correct_answer} onChange={(e) => setQ({ ...q, correct_answer: e.target.value })} className="ml-2 px-2 py-1 rounded border bg-background">
            {["A", "B", "C", "D"].map((k) => <option key={k}>{k}</option>)}
          </select>
        </label>
        <label className="text-sm">Difficulty:
          <select value={q.difficulty} onChange={(e) => setQ({ ...q, difficulty: e.target.value })} className="ml-2 px-2 py-1 rounded border bg-background">
            {["easy", "medium", "hard"].map((k) => <option key={k}>{k}</option>)}
          </select>
        </label>
      </div>
      <textarea value={q.explanation} onChange={(e) => setQ({ ...q, explanation: e.target.value })} placeholder="Explanation" rows={3} className="w-full p-3 rounded-md border bg-background" />
      <button onClick={save} disabled={busy} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm disabled:opacity-50">{busy ? "Saving…" : "Add question"}</button>
    </div>
  );
}

function PdfUpload({ courses, year, source, userId }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"extract" | "generate">("extract");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<"idle" | "extracting" | "analyzing" | "saving">("idle");
  const [preview, setPreview] = useState<any[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  async function run() {
    if (!file) return toast.error("Pick a PDF first.");
    if (!courses.length) return toast.error("Courses not loaded yet.");
    setPreview([]); setSavedCount(0);
    try {
      setStage("extracting"); setProgress(0);
      const text = await extractPdfText(file, (p) => setProgress(Math.round(p * 100)));
      if (text.trim().length < 100) {
        setStage("idle");
        return toast.error("Couldn't read text from this PDF. It may be a scanned image.");
      }

      setStage("analyzing");
      const res = await fetch("/api/public/pdf-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          mode,
          countPerChunk: 6,
          courses: courses.map((c: any) => ({ slug: c.slug, name: c.name, topics: c.topics })),
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `AI failed (${res.status})`);
      }
      const { questions, chunks_processed, total_chunks } = (await res.json()) as any;
      if (!questions?.length) {
        setStage("idle");
        return toast.error("No questions found in the PDF.");
      }
      setPreview(questions);
      toast.success(`Found ${questions.length} questions (processed ${chunks_processed}/${total_chunks} chunks)`);

      // Save
      setStage("saving");
      const slugToId = new Map(courses.map((c: any) => [c.slug, c.id]));
      const rows = questions
        .filter((q: any) => slugToId.has(q.course_slug))
        .map((q: any) => ({
          course_id: slugToId.get(q.course_slug),
          question_text: q.question_text,
          option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          difficulty: q.difficulty || "medium",
          topic: q.topic || null,
          year: year ? parseInt(year) : null,
          source: source || file!.name,
          created_by: userId,
        }));
      if (!rows.length) {
        setStage("idle");
        return toast.error("AI couldn't map questions to any course.");
      }
      const { error } = await supabase.from("questions").insert(rows);
      if (error) throw error;
      setSavedCount(rows.length);
      toast.success(`Saved ${rows.length} questions to your bank`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setStage("idle");
    }
  }

  // Group preview by course
  const grouped = preview.reduce((acc: Record<string, any[]>, q: any) => {
    (acc[q.course_slug] ||= []).push(q);
    return acc;
  }, {});

  const busy = stage !== "idle";

  return (
    <div className="space-y-3">
      <div className="rounded-lg border-2 border-dashed p-6 text-center bg-background/50">
        <FileUp className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block mx-auto text-sm" />
        {file && <p className="text-xs text-muted-foreground mt-2">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm flex items-center gap-2">
          <input type="radio" checked={mode === "extract"} onChange={() => setMode("extract")} />
          Past-exam PDF (extract existing MCQs)
        </label>
        <label className="text-sm flex items-center gap-2">
          <input type="radio" checked={mode === "generate"} onChange={() => setMode("generate")} />
          Course notes PDF (generate new MCQs)
        </label>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Questions are auto-classified into the right course. Scanned PDFs (images) aren't supported yet.
        </p>
        <button onClick={run} disabled={busy || !file}
          className="inline-flex items-center gap-2 bg-gold text-gold-foreground px-4 py-2 rounded-md text-sm disabled:opacity-50">
          <Wand2 className="w-4 h-4" />
          {stage === "extracting" ? `Reading PDF… ${progress}%`
            : stage === "analyzing" ? "AI analyzing…"
            : stage === "saving" ? "Saving…"
            : "Process PDF"}
        </button>
      </div>

      {!!preview.length && (
        <div className="border-t pt-3 space-y-3">
          <p className="text-sm font-medium">
            {savedCount ? `Saved ${savedCount} questions` : "Preview"} · grouped by course
          </p>
          {Object.entries(grouped).map(([slug, qs]) => {
            const c = courses.find((x: any) => x.slug === slug);
            return (
              <details key={slug} className="rounded-md border bg-background/40 p-3" open>
                <summary className="cursor-pointer text-sm font-medium">
                  {c?.name || slug} <span className="text-muted-foreground">({qs.length})</span>
                </summary>
                <ul className="mt-2 space-y-2 text-sm">
                  {qs.slice(0, 5).map((q, i) => (
                    <li key={i} className="border-l-2 border-gold/50 pl-3">
                      <p className="font-medium">{q.question_text}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Answer: <strong>{q.correct_answer}</strong> · {q.topic} · {q.difficulty}
                      </p>
                    </li>
                  ))}
                  {qs.length > 5 && <li className="text-xs text-muted-foreground">+ {qs.length - 5} more</li>}
                </ul>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
