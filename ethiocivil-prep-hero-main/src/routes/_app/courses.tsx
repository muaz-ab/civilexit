import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/_app/courses")({ component: CoursesIndex });

function CoursesIndex() {
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
      const { data } = await supabase.from("user_course_progress").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
  });
  const { data: counts = {} } = useQuery({
    queryKey: ["question-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("questions").select("course_id");
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { map[r.course_id] = (map[r.course_id] || 0) + 1; });
      return map;
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl">Courses</h1>
        <p className="text-muted-foreground mt-1">All 13 exit-exam subjects. Click any to dive in.</p>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((c: any) => {
          const p = progress.find((x: any) => x.course_id === c.id);
          const mastery = Math.round(Number(p?.mastery ?? 0));
          const qCount = counts[c.id] ?? 0;
          return (
            <Link key={c.id} to="/courses/$slug" params={{ slug: c.slug }}
              className="group rounded-xl border bg-card p-5 hover:border-gold hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-md bg-primary/10 text-primary grid place-items-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="text-xs px-2 py-0.5 rounded-full bg-gold/15 text-gold-foreground/80 border border-gold/30">
                  weight {Number(c.weight).toFixed(1)}×
                </div>
              </div>
              <h3 className="font-display text-lg mt-3 leading-tight">{c.name}</h3>
              <div className="text-xs text-muted-foreground mt-1">{(Array.isArray(c.topics) ? c.topics.length : 0)} topics · {qCount} questions</div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground"><span>Mastery</span><span>{mastery}%</span></div>
                <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${mastery}%` }} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
