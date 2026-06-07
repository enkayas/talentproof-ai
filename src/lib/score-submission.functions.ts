import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({ submissionId: z.string().uuid() });

const SubmitInput = z.object({
  jobId: z.string().min(1),
  candidate_name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  whatsapp: z.string().max(50).nullable().optional(),
  linkedin: z.string().max(500).nullable().optional(),
  answers: z.array(z.string().max(5000)).max(50),
  portfolio_link: z.string().max(1000).nullable().optional(),
  cv_text: z.string().max(50000).nullable().optional(),
  cv_file_path: z.string().max(500).nullable().optional(),
});

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

async function runScoring(submissionId: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { ok: false as const, reason: "no-api-key" };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: sub, error: subErr } = await supabaseAdmin
    .from("submissions")
    .select("id, job_id, candidate_name, answers, portfolio_link, cv_text, cv_file_path, qa_score")
    .eq("id", submissionId)
    .maybeSingle();

  if (subErr || !sub) return { ok: false as const, reason: "submission-not-found" };
  if (sub.qa_score !== null && sub.qa_score !== undefined) {
    return { ok: true as const, score: Number(sub.qa_score), cached: true };
  }

  const { data: job } = await supabaseAdmin
    .from("jobs")
    .select("job_title, job_description, questions")
    .eq("id", sub.job_id)
    .maybeSingle();

  const job_title = job?.job_title ?? "(unknown)";
  const job_description = (job as { job_description?: string | null } | null)?.job_description ?? null;

  // 1. Download CV file from storage and convert to base64.
  let base64Pdf = "";
  if (sub.cv_file_path) {
    try {
      const { data: file, error: dlErr } = await supabaseAdmin.storage
        .from("cv-resumes")
        .download(sub.cv_file_path);
      if (dlErr || !file) {
        console.warn("[scoreSubmission] CV download failed:", dlErr?.message);
      } else {
        const arrayBuffer = await file.arrayBuffer();
        base64Pdf = Buffer.from(arrayBuffer).toString("base64");
      }
    } catch (e) {
      console.warn("[scoreSubmission] CV download exception:", e);
    }
  }

  // 2. Verification logs (placeholder; AI call comes later).
  console.log("[scoreSubmission] job_title:", job_title);
  console.log("[scoreSubmission] job_description:", job_description ?? "(none)");
  console.log("[scoreSubmission] base64Pdf[0..50]:", base64Pdf.slice(0, 50));

  // 3. Build Gemini multimodal request.
  const systemPrompt = `You are a deterministic, elite corporate recruitment algorithm. Compare the attached candidate CV PDF directly against the target Job Title: ${job_title} and Job Description: ${job_description ?? "(not provided)"}. Calculate an exact mathematical integer score from 0 to 100 by summing these three explicit pillars. Do not use generic holistic rounding.

- Pillar 1: Role & Domain Core Alignment (Max 40 Points)
  * 0-15 Points: The candidate's past job titles and described duties share zero industry or functional overlap with the target job title.
  * 16-30 Points: The candidate operates in the correct general industry, but their historical tier, scope of work, or experience depth is too shallow for the target requirements.
  * 31-40 Points: Past job titles and work history map cleanly and directly to the target job title. They show a clear historical trajectory proving they can step into this role immediately on Day 1.

- Pillar 2: Hard Skill & Tool Competency Matrix (Max 30 Points)
  * Identify direct hard skills, tools, legal frameworks, or software stacks explicitly requested in the Job Description.
  * Calculate score as: S_skills = Min(30, Number_of_Direct_Matches * 6).
  * CRITICAL PENALTY: If a hard skill is listed as a loose buzzword in a 'Skills list' but has zero supporting context or mention within their actual work history bullet points, reduce that specific skill's value by 50% to penalize keyword stuffing.

- Pillar 3: Impact Density & Proven Track Record (Max 30 Points)
  * 0-10 Points (Passive/Duty-focused): The resume elements only list daily tasks and generic operational assignments.
  * 25-30 Points (Active/Outcome-driven): Past roles showcase clear, metric-driven outcome statements featuring explicit numerical data vectors, growth percentages, monetary values, or time-saving milestones.

Return strictly clean JSON, no markdown fences, no conversational wrapping:
{"cv_score": <integer>, "key_matches": ["2-3 specific positive bullets of direct operational or metric alignment"], "cv_summary": "<concise 2-sentence professional background summary highlighting biggest strengths for this role>"}

CRITICAL: Do not include any negative feedback, weaknesses, or missing-gap arrays in the output.`;

  let aiResponse: { cv_score: number; key_matches: string[]; cv_summary: string } | null = null;

  try {
    const userContent: Array<Record<string, unknown>> = [
      { type: "text", text: `Evaluate the attached CV for the role above. Return JSON only.` },
    ];
    if (base64Pdf) {
      userContent.push({
        type: "file",
        file: {
          filename: "cv.pdf",
          file_data: `data:application/pdf;base64,${base64Pdf}`,
        },
      });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[scoreSubmission] gateway error", res.status, errBody);
      return { ok: false as const, reason: `gateway-${res.status}` };
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return { ok: false as const, reason: "no-json" };

    const parsed = JSON.parse(match[0]);
    const score = Number(parsed?.cv_score);
    if (!Number.isFinite(score)) return { ok: false as const, reason: "bad-score" };

    aiResponse = {
      cv_score: Math.max(0, Math.min(100, Math.round(score))),
      key_matches: Array.isArray(parsed?.key_matches)
        ? parsed.key_matches.map((s: unknown) => String(s)).slice(0, 5)
        : [],
      cv_summary: String(parsed?.cv_summary ?? "").slice(0, 1000),
    };
  } catch (e) {
    console.error("[scoreSubmission] exception", e);
  }

  // 4. Persist to submissions row (with graceful fallback on AI failure).
  const isFallback = aiResponse === null;
  const safeResponse = aiResponse ?? {
    cv_score: 0,
    key_matches: [],
    cv_summary: "AI evaluation failed; defaulted to fallback values.",
  };

  const reasoningBlock = [
    safeResponse.cv_summary,
    safeResponse.key_matches.length ? "\n\nKey matches:\n- " + safeResponse.key_matches.join("\n- ") : "",
  ].join("");

  const cvAnalysis = isFallback
    ? {
        error: "ai-parse-or-call-failed",
        key_matches: [],
        cv_summary: safeResponse.cv_summary,
        logged_at: new Date().toISOString(),
      }
    : {
        key_matches: safeResponse.key_matches,
        cv_summary: safeResponse.cv_summary,
      };

  const { error: updErr } = await supabaseAdmin
    .from("submissions")
    .update({
      qa_score: safeResponse.cv_score,
      cv_score: safeResponse.cv_score,
      cv_analysis: cvAnalysis,
      ai_reasoning: reasoningBlock,
    })
    .eq("id", submissionId);

  if (updErr) {
    console.error("[scoreSubmission] update failed:", updErr.message);
    return { ok: false as const, reason: "update-failed" };
  }

  return { ok: true as const, ...safeResponse, fallback: isFallback };
}

export const scoreSubmission = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => runScoring(data.submissionId));

export const submitApplication = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SubmitInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: inserted, error } = await supabaseAdmin
      .from("submissions")
      .insert({
        job_id: data.jobId,
        candidate_name: data.candidate_name,
        email: data.email,
        whatsapp: data.whatsapp ?? null,
        linkedin: data.linkedin ?? null,
        answers: data.answers,
        portfolio_link: data.portfolio_link ?? null,
        cv_text: data.cv_text ?? null,
        cv_file_path: data.cv_file_path ?? null,
        qa_score: null,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      return { ok: false as const, reason: error?.message ?? "insert-failed" };
    }

    // Score synchronously so the candidate's network call holds the request
    // until the AI has written qa_score + ai_reasoning. This guarantees the
    // scoring cannot be aborted by the browser unmounting on success.
    const scoring = await runScoring(inserted.id);

    return { ok: true as const, submissionId: inserted.id, scoring };
  });
