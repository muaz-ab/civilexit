import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { extractPdfText } from "@/lib/pdf-extract";
import { ArrowLeft, Dumbbell, Database, FileUp, FileText, Trash2, Loader2, BookOpen, ListChecks, Sparkles, NotebookPen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/courses/$slug")({ component: CourseDetail });

function CourseDetail() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: course } = useQuery({
    queryKey: ["course", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("slug", slug).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["progress", user?.id, course?.id],
    enabled: !!user && !!course,
    queryFn: async () => {
      const { data } = await supabase.from("user_course_progress").select("*")
        .eq("user_id", user!.id).eq("course_id", course!.id).maybeSingle();
      return data;
    },
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["course-questions", course?.id],
    enabled: !!course,
    queryFn: async () => {
      const { data } = await supabase.from("questions").select("id,topic,difficulty,year,question_text,source")
        .eq("course_id", course!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["course-materials", course?.id],
    enabled: !!course,
    queryFn: async () => {
      const { data } = await supabase.from("course_materials")
        .select("id,name,kind,storage_path,page_count,created_at,user_id")
        .eq("course_id", course!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!course) return <div className="text-muted-foreground">Loading…</div>;
  const mastery = Math.round(Number(progress?.mastery ?? 0));
  const topics = (Array.isArray(course.topics) ? course.topics : []) as string[];
  const byTopic = topics.map((t) => ({ topic: t, count: questions.filter((q: any) => q.topic === t).length }));

  const notes = materials.filter((m: any) => m.kind === "notes");
  const questionPdfs = materials.filter((m: any) => m.kind === "questions");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["course-materials", course.id] });
    qc.invalidateQueries({ queryKey: ["course-questions", course.id] });
  };

  return (
    <div className="space-y-6">
      <Link to="/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> All courses
      </Link>
      <header className="rounded-xl bg-card border p-6">
        <div className="text-xs uppercase tracking-widest text-gold">Course · weight {Number(course.weight).toFixed(1)}×</div>
        <h1 className="font-display text-3xl md:text-4xl mt-2">{course.name}</h1>
        <div className="mt-4 grid sm:grid-cols-4 gap-4">
          <Mini label="Mastery" value={`${mastery}%`} />
          <Mini label="Attempted" value={String(progress?.questions_attempted ?? 0)} />
          <Mini label="Question bank" value={String(questions.length)} />
          <Mini label="Materials" value={String(materials.length)} />
        </div>
        <div className="mt-5 flex gap-2 flex-wrap">
          <Link to="/practice" search={{ course: course.slug } as any}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-secondary text-sm">
            <Dumbbell className="w-4 h-4" /> Practice this course
          </Link>
          <Link to="/question-bank" search={{ course: course.slug } as any}
            className="inline-flex items-center gap-2 border px-4 py-2 rounded-md hover:bg-accent text-sm">
            <Database className="w-4 h-4" /> Add questions manually
          </Link>
        </div>
      </header>

      <section className="grid md:grid-cols-2 gap-4">
        <UploadCard
          title="Course materials (notes)"
          subtitle="Upload lecture notes / textbook PDFs. Used to ground answers & explanations."
          icon={<BookOpen className="w-5 h-5 text-gold" />}
          kind="notes"
          course={course}
          onDone={refresh}
        />
        <UploadCard
          title="Past-exam question PDFs"
          subtitle="Upload past-exam PDFs. We extract questions and use uploaded notes to answer & explain them."
          icon={<ListChecks className="w-5 h-5 text-gold" />}
          kind="questions"
          course={course}
          onDone={refresh}
        />
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <MaterialList title="Notes" items={notes} userId={user?.id} onChange={refresh} />
        <MaterialList title="Question PDFs" items={questionPdfs} userId={user?.id} onChange={refresh} />
      </section>

      <StudyNotesPanel course={course} userId={user?.id} />

      <section>
        <h2 className="font-display text-2xl mb-3">Topics</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {byTopic.map((t: any) => (
            <div key={t.topic} className="flex justify-between items-center rounded-md border bg-card px-4 py-3">
              <span className="text-sm">{t.topic}</span>
              <span className="text-xs text-muted-foreground">{t.count} questions</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl mb-3">Recent questions</h2>
        <div className="space-y-2">
          {questions.slice(0, 10).map((q: any) => (
            <div key={q.id} className="rounded-md border bg-card px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                {q.topic && <span className="px-2 py-0.5 rounded bg-muted">{q.topic}</span>}
                {q.year && <span>· {q.year}</span>}
                {q.source && <span>· {q.source}</span>}
                <span className="ml-auto">{q.difficulty}</span>
              </div>
              <div className="line-clamp-2">{q.question_text}</div>
            </div>
          ))}
          {!questions.length && <p className="text-sm text-muted-foreground">No questions yet — upload a past-exam PDF above.</p>}
        </div>
      </section>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-2xl mt-1">{value}</div>
    </div>
  );
}

function UploadCard({
  title, subtitle, icon, kind, course, onDone,
}: {
  title: string; subtitle: string; icon: React.ReactNode;
  kind: "notes" | "questions"; course: any; onDone: () => void;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>("");

  async function handleFile(file: File) {
    if (!user) { toast.error("Sign in first"); return; }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("PDF only"); return;
    }
    setBusy(true); setProgress(0); setStatus("Extracting text…");
    try {
      const text = await extractPdfText(file, (p) => setProgress(Math.round(p * 50)));
      if (text.trim().length < 50) throw new Error("PDF appears empty or is a scan (OCR not supported yet)");

      setStatus("Uploading file…");
      const path = `${user.id}/${course.id}/${kind}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("course-materials").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      setProgress(60);

      const { data: matRow, error: matErr } = await supabase.from("course_materials").insert({
        course_id: course.id, user_id: user.id, name: file.name, kind, storage_path: path, extracted_text: text,
      }).select("id").single();
      if (matErr) throw matErr;

      if (kind === "questions") {
        setStatus("Loading course notes for grounding…");
        const { data: notesRows } = await supabase.from("course_materials")
          .select("extracted_text").eq("course_id", course.id).eq("kind", "notes");
        const referenceText = (notesRows ?? []).map((r: any) => r.extracted_text || "").join("\n\n").slice(0, 60000);

        setStatus("Extracting & answering questions with AI…");
        setProgress(75);
        const res = await fetch("/api/public/pdf-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text, mode: "extract",
            courses: [{ slug: course.slug, name: course.name, topics: (course.topics as any) ?? [] }],
            referenceText,
          }),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || "AI extraction failed");
        }
        const { questions } = (await res.json()) as { questions: any[] };
        setProgress(90);
        if (questions?.length) {
          const rows = questions.map((q) => ({
            course_id: course.id,
            question_text: q.question_text,
            option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            difficulty: q.difficulty ?? "medium",
            topic: q.topic ?? null,
            source: `PDF: ${file.name}`,
            created_by: user.id,
          }));
          const { error: insErr } = await supabase.from("questions").insert(rows);
          if (insErr) throw insErr;
          toast.success(`Added ${rows.length} questions from ${file.name}`);
        } else {
          toast.warning("No MCQs detected in this PDF");
        }
      } else {
        toast.success(`Uploaded notes: ${file.name}`);
      }
      setProgress(100);
      onDone();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Upload failed");
    } finally {
      setBusy(false); setStatus(""); setProgress(0);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 mb-1">{icon}<h3 className="font-display text-lg">{title}</h3></div>
      <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>
      <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-gold transition-colors ${busy ? "opacity-60 pointer-events-none" : ""}`}>
        {busy ? <Loader2 className="w-6 h-6 animate-spin text-gold" /> : <FileUp className="w-6 h-6 text-muted-foreground" />}
        <span className="text-sm">{busy ? status : "Click to choose a PDF"}</span>
        <input type="file" accept="application/pdf" className="hidden" disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        {busy && (
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-2">
            <div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </label>
    </div>
  );
}

function MaterialList({ title, items, userId, onChange }:
  { title: string; items: any[]; userId?: string; onChange: () => void }) {
  async function remove(m: any) {
    if (!confirm(`Delete "${m.name}"?`)) return;
    await supabase.storage.from("course-materials").remove([m.storage_path]);
    const { error } = await supabase.from("course_materials").delete().eq("id", m.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); onChange(); }
  }
  async function openFile(m: any) {
    const { data, error } = await supabase.storage.from("course-materials").createSignedUrl(m.storage_path, 60);
    if (error || !data) { toast.error("Cannot open file"); return; }
    window.open(data.signedUrl, "_blank");
  }
  return (
    <div className="rounded-xl border bg-card p-4">
      <h4 className="font-display text-base mb-2">{title} <span className="text-xs text-muted-foreground">({items.length})</span></h4>
      {items.length === 0 && <p className="text-xs text-muted-foreground">None yet.</p>}
      <ul className="space-y-1">
        {items.map((m) => (
          <li key={m.id} className="flex items-center gap-2 text-sm rounded-md hover:bg-muted/50 px-2 py-1.5">
            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
            <button onClick={() => openFile(m)} className="truncate text-left flex-1 hover:underline">{m.name}</button>
            {m.user_id === userId && (
              <button onClick={() => remove(m)} className="text-muted-foreground hover:text-destructive" aria-label="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StudyNotesPanel({ course, userId }: { course: any; userId?: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: notes = [] } = useQuery({
    queryKey: ["study-notes", userId, course.id],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("study_notes")
        .select("id,topic,title,content,created_at")
        .eq("user_id", userId!).eq("course_id", course.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function generate() {
    if (!userId) { toast.error("Sign in first"); return; }
    setBusy(true);
    try {
      // Pull recent attempts for this course
      const { data: attempts } = await supabase
        .from("user_question_attempts")
        .select("question_id,is_correct")
        .eq("user_id", userId)
        .eq("course_id", course.id)
        .order("attempted_at", { ascending: false })
        .limit(40);

      const qIds = Array.from(new Set((attempts ?? []).map((a: any) => a.question_id))).filter(Boolean);
      const { data: qrows } = qIds.length
        ? await supabase.from("questions")
            .select("id,question_text,correct_answer,explanation,topic")
            .in("id", qIds)
        : { data: [] as any[] };
      const qMap = new Map<string, any>((qrows ?? []).map((q: any) => [q.id, q]));
      const studied = (attempts ?? []).map((a: any) => {
        const q = qMap.get(a.question_id);
        return q ? {
          question_text: q.question_text, correct_answer: q.correct_answer,
          explanation: q.explanation, topic: q.topic, was_correct: a.is_correct,
        } : null;
      }).filter(Boolean) as any[];

      if (!studied.length) {
        toast.error("Practice at least a few questions in this course first.");
        return;
      }

      const { data: notesRows } = await supabase.from("course_materials")
        .select("extracted_text").eq("course_id", course.id).eq("kind", "notes");
      const referenceText = (notesRows ?? []).map((r: any) => r.extracted_text || "").join("\n\n").slice(0, 60000);

      const res = await fetch("/api/public/study-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseName: course.name,
          topics: (course.topics as any) ?? [],
          studiedQuestions: studied,
          referenceText,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "AI failed");
      }
      const { notes: newNotes } = (await res.json()) as { notes: any[] };
      if (!newNotes?.length) { toast.warning("No notes generated"); return; }

      const rows = newNotes.map((n) => ({
        user_id: userId, course_id: course.id, topic: n.topic, title: n.title, content: n.content,
      }));
      const { error } = await supabase.from("study_notes").insert(rows);
      if (error) throw error;
      toast.success(`Generated ${rows.length} revision notes`);
      qc.invalidateQueries({ queryKey: ["study-notes", userId, course.id] });
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await supabase.from("study_notes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["study-notes", userId, course.id] });
  }

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <NotebookPen className="w-5 h-5 text-gold" />
          <h2 className="font-display text-2xl">Revision notes from your practice</h2>
        </div>
        <button onClick={generate} disabled={busy}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-secondary text-sm disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {busy ? "Generating…" : "Generate from recent practice"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        AI summarises what you've practiced into concise revision cards — focused on the topics you got wrong, grounded in your uploaded course notes.
      </p>
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes yet. Practice a few questions, then click generate.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {notes.map((n: any) => (
            <article key={n.id} className="rounded-lg border bg-background p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gold">{n.topic}</div>
                  <h3 className="font-display text-lg">{n.title}</h3>
                </div>
                <button onClick={() => remove(n.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{n.content}</div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
