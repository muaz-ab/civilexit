export const EXAM_DATE = new Date("2026-06-12T08:00:00+03:00");

export function daysUntilExam(now = new Date()): number {
  const ms = EXAM_DATE.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function timeUntilExam(now = new Date()) {
  const ms = Math.max(0, EXAM_DATE.getTime() - now.getTime());
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

export function readinessLabel(score: number): { label: string; tone: string } {
  if (score >= 85) return { label: "Ready", tone: "text-success" };
  if (score >= 65) return { label: "Almost Ready", tone: "text-gold" };
  if (score >= 40) return { label: "Needs Work", tone: "text-warning" };
  return { label: "Not Ready", tone: "text-destructive" };
}
