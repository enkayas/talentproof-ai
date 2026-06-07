import { Loader2 } from "lucide-react";

export function getScoreTone(score: number) {
  if (score >= 80) return "bg-emerald-950/40 text-emerald-400 border-emerald-800/50";
  if (score >= 50) return "bg-amber-950/40 text-amber-400 border-amber-800/50";
  return "bg-rose-950/40 text-rose-400 border-rose-800/50";
}

export function ScoreBadge({
  score,
  size = "sm",
  variant = "badge",
}: {
  score: number | null;
  size?: "sm" | "md";
  variant?: "badge" | "pill";
}) {
  const px = size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs";
  if (score === null || score === undefined) {
    if (variant === "pill") {
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-slate-800/60 text-slate-300 border border-slate-700/60">
          Pending
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full ${px} font-medium bg-slate-800/60 text-slate-300 border border-slate-700/60 animate-pulse`}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        Evaluating…
      </span>
    );
  }
  const s = Math.round(score);
  if (variant === "pill") {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums border ${getScoreTone(s)}`}
      >
        {s}/100
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-full ${px} font-medium tabular-nums border ${getScoreTone(s)}`}
    >
      {s}/100
    </span>
  );
}
