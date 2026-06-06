import { useEffect, useState } from "react";
import { timeUntilExam, EXAM_DATE } from "@/lib/exam";

export function Countdown() {
  const [t, setT] = useState(timeUntilExam());
  useEffect(() => {
    const i = setInterval(() => setT(timeUntilExam()), 1000);
    return () => clearInterval(i);
  }, []);
  const blocks = [
    { v: t.days, l: "Days" },
    { v: t.hours, l: "Hours" },
    { v: t.minutes, l: "Min" },
    { v: t.seconds, l: "Sec" },
  ];
  return (
    <div className="rounded-xl bg-primary text-primary-foreground p-6 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-30"
        style={{ background: "radial-gradient(circle at 80% 20%, var(--gold), transparent 50%)" }}
      />
      <div className="relative">
        <div className="text-sm uppercase tracking-widest text-gold/90">Exit Exam Countdown</div>
        <div className="text-xs text-primary-foreground/70 mb-4">
          {EXAM_DATE.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {blocks.map((b) => (
            <div key={b.l} className="rounded-lg bg-primary-foreground/10 backdrop-blur p-3 text-center">
              <div className="font-display text-3xl md:text-4xl tabular-nums text-gold">{String(b.v).padStart(2, "0")}</div>
              <div className="text-[10px] uppercase tracking-wider text-primary-foreground/70">{b.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
