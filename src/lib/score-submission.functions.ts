import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({ submissionId: z.string().uuid() });

const SYSTEM_PROMPT = `You are a deterministic mathematical scoring engine designed to evaluate candidate text answers. You must calculate a final integer score out of 100 based strictly on the three quantitative formulas below. Do not use holistic impressions. Treat the evaluation with extreme statistical rigor.

1. CALCULATE DEPTH SCORE (S_depth, Max 40):
- Count the number of unique, actionable execution steps or real-world practical strategies provided (Variable E).
- Count the number of specific contextual constraints, legal clauses, operational risks, or parameters acknowledged (Variable C).
- Compute using the formula: S_depth = Min(40, (E * 8) + (C * 6)).
- CRITICAL EXCEPTION: If the candidate provides zero active execution strategies (E = 0) and only defines textbook terms, completely bypass the formula and force cap S_depth to a maximum of 10.

2. CALCULATE AUTHENTICITY SCORE (S_auth, Max 30):
- Start with a base score of 30. Apply the following negative point modifiers cumulatively:
  * Deduct 15 points immediately if the text uses perfectly symmetric layout blocks where every paragraph/bullet point is prefaced with a bold structural title header (e.g., '**Title:** text').
  * Deduct 5 points for every structural boilerplate framing wrapper found (e.g., 'In conclusion', 'It is vital to analyze', 'Let us look at').
  * Deduct 3 points for every unique high-frequency LLM buzzword present: delve, testament, leverage, tapestry, underscore, paramount, bespoke.
- Compute using the formula: S_auth = Max(0, 30 - Total_AI_Penalties).

3. CALCULATE CLARITY & CONSTRAINT SCORE (S_logic, Max 30):
- Let W be the total word count. If W > 150, calculate a word penalty: P_words = (W - 150) * 2. If W <= 150, P_words = 0.
- Let A be a binary variable: A = 1 if the core question is answered directly; A = 0 if the response evades the question.
- Let I be the Information Density coefficient evaluated on a strict scale from 0.1 (all fluff/jargon) to 1.0 (pure concise insight).
- Compute using the formula: S_logic = Max(0, (30 * I * A) - P_words).

4. FINAL COMBINATION & OUTPUT:
- Sum the components: Final_Score = S_depth + S_auth + S_logic.
- Ensure high mathematical variance; do not cluster scores around the 70-80 average range. High-fluff or AI-copied text should drop below 50 naturally through penalties.

Return the final payload strictly as a flat JSON object:
{"final_score": <integer>, "analysis_reasoning": "<concise 2-sentence breakdown detailing the math>"}

No prose, no markdown fences.`;

export const scoreSubmission = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ok: false as const, reason: "no-api-key" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Load submission
    const { data: sub, error: subErr } = await supabaseAdmin
      .from("submissions")
      .select("id, job_id, candidate_name, answers, portfolio_link, cv_text, qa_score")
      .eq("id", data.submissionId)
      .maybeSingle();

    if (subErr || !sub) return { ok: false as const, reason: "submission-not-found" };
    if (sub.qa_score !== null && sub.qa_score !== undefined) {
      return { ok: true as const, score: Number(sub.qa_score), cached: true };
    }

    // Load job for questions + title
    const { data: job } = await supabaseAdmin
      .from("jobs")
      .select("job_title, questions")
      .eq("id", sub.job_id)
      .maybeSingle();

    const questions = Array.isArray(job?.questions) ? (job!.questions as string[]) : [];
    const answers = Array.isArray(sub.answers) ? (sub.answers as string[]) : [];

    const qa = questions
      .map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${answers[i] ?? "(no answer)"}`)
      .join("\n\n");

    const userPrompt = `Role: ${job?.job_title ?? "(unknown)"}
Candidate: ${sub.candidate_name}

${qa}

${sub.portfolio_link ? `Portfolio: ${sub.portfolio_link}\n` : ""}${sub.cv_text ? `Resume:\n${sub.cv_text}\n` : ""}
Evaluate now. Return JSON only.`;

    let score: number | null = null;
    let reasoning = "";

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": key,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!res.ok) {
        return { ok: false as const, reason: `gateway-${res.status}` };
      }
      const json = await res.json();
      const content: string = json?.choices?.[0]?.message?.content ?? "";
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) return { ok: false as const, reason: "no-json" };
      const parsed = JSON.parse(match[0]);
      const s = Number(parsed?.final_score ?? parsed?.score);
      if (!Number.isFinite(s)) return { ok: false as const, reason: "bad-score" };
      score = Math.max(0, Math.min(100, Math.round(s)));
      reasoning = String(parsed?.analysis_reasoning ?? parsed?.reasoning ?? "").slice(0, 600);
    } catch (e) {
      return { ok: false as const, reason: "exception" };
    }

    const { error: updErr } = await supabaseAdmin
      .from("submissions")
      .update({ qa_score: score, ai_reasoning: reasoning })
      .eq("id", data.submissionId);

    if (updErr) return { ok: false as const, reason: "update-failed" };

    return { ok: true as const, score, reasoning };
  });
