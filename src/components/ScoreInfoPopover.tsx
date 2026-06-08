import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Tier = { range: string; label: string; description: string; tone: "good" | "mid" | "low" };

type Props = {
  label: string;
  heading: string;
  description: string;
  tiers: Tier[];
};

const toneClass: Record<Tier["tone"], string> = {
  good: "bg-emerald-950/40 text-emerald-400 border-emerald-800/50",
  mid: "bg-amber-950/40 text-amber-400 border-amber-800/50",
  low: "bg-rose-950/40 text-rose-400 border-rose-800/50",
};

export function ScoreInfoPopover({ label, heading, description, tiers }: Props) {
  return (
    <span className="inline-flex items-center justify-center gap-1.5">
      <span>{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`${label} grading info`}
            className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          sideOffset={8}
          className="w-80 bg-card border border-border shadow-xl rounded-xl p-4 normal-case tracking-normal"
        >
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">{heading}</h4>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
            </div>
            <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {tiers.map((t) => (
                <div key={t.range} className="flex items-start gap-3 p-2.5 bg-foreground/5">
                  <span
                    className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums border ${toneClass[t.tone]}`}
                  >
                    {t.range}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-foreground">{t.label}</div>
                    <div className="text-[11px] leading-relaxed text-muted-foreground">
                      {t.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </span>
  );
}

export const ANSWER_SCORE_INFO = {
  label: "Answer Score",
  heading: "Answer Evaluation Breakdown",
  description:
    "Measures the depth, clarity, and objective technical accuracy of the candidate's custom screening responses graded against the answer guidelines.",
  tiers: [
    {
      range: "80–100",
      label: "Top Tier Master",
      description:
        "Demonstrates exceptional domain depth and bulletproof logical validation.",
      tone: "good" as const,
    },
    {
      range: "60–79",
      label: "Core Proficient",
      description:
        "Understands core industry concepts but lacks advanced nuances or elite mastery.",
      tone: "mid" as const,
    },
    {
      range: "<60",
      label: "Developing",
      description:
        "Contains noticeable technical gaps, missing vectors, or highly shallow explanations.",
      tone: "low" as const,
    },
  ],
};

export const CV_SCORE_INFO = {
  label: "CV Score",
  heading: "CV Alignment Breakdown",
  description:
    "Calculated algorithmically based on our 3-Pillar Master Rubric checking historical role tracking (40 pts), direct tool/hard skill matching with keyword stuffing penalties (30 pts), and quantitative business impact metrics (30 pts).",
  tiers: [
    {
      range: "80–100",
      label: "Elite Match",
      description:
        "Clean historical career trajectory, matching role title, deep asset/tool stack overlap, and strong data-driven metric outcomes.",
      tone: "good" as const,
    },
    {
      range: "50–79",
      label: "Moderate Fit",
      description:
        "Operates within the correct functional industry or owns the right tools, but exhibits shallow target experience levels or less quantifiable metrics.",
      tone: "mid" as const,
    },
    {
      range: "<50",
      label: "Alternative Profile",
      description:
        "The candidate's core historical duties, title depth, and past responsibilities lean outside the scope of your specific requirements.",
      tone: "low" as const,
    },
  ],
};
