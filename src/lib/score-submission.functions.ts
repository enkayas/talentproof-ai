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

const QA_SYSTEM_PROMPT = `You are a cynical, elite recruiter evaluating candidates for a entry-level professional role. Review the candidate's text answers strictly against the provided prompt using this 100-point rubric. Be hyper-critical. 1. Depth & Execution Strategy (40 pts): Award points only if they provide a concrete, step-by-step practical action plan. Give 0-15 if it is generic textbook theory. 2. Authenticity & Structure (30 pts): Deduct 20 points immediately if the text shows clear signatures of being generated or structured by an AI assistant (e.g., overly formal introductions, perfect bullet points introduced by clean alliterative bold titles, robotic summary transitions). Reward natural human tone. 3. Value Density (30 pts): Grade how much substance is delivered. Deduct points heavily for corporate fluff, padding, or repeating the question. Calculate the final combined score out of 100. Return your evaluation strictly as a structured JSON object with two fields: { "final_score": number, "analysis_reasoning": "A concise 2-sentence summary explaining where they lost points (e.g., AI-assisted formatting flag, or lack of depth)." }

Return strictly clean JSON only — no markdown fences, no prose wrapping.`;

type QaResult =
  | { skipped: true }
  | { skipped: false; final_score: number; analysis_reasoning: string; fallback: boolean };

async function runQaScoring(
  questions: unknown,
  answers: unknown,
  apiKey: string,
): Promise<QaResult> {
  const ansArr: string[] = Array.isArray(answers)
    ? (answers as unknown[]).map((a) => String(a ?? "").trim())
    : [];
  if (ansArr.length === 0 || ansArr.every((a) => a.length === 0)) {
    return { skipped: true };
  }

  const qArr: string[] = Array.isArray(questions)
    ? (questions as unknown[]).map((q) => {
        if (typeof q === "string") return q;
        if (q && typeof q === "object") {
          const obj = q as Record<string, unknown>;
          return String(obj.label ?? obj.text ?? obj.question ?? obj.prompt ?? "");
        }
        return "";
      })
    : [];

  const lines: string[] = [];
  const total = Math.max(qArr.length, ansArr.length);
  for (let i = 0; i < total; i++) {
    lines.push(`Q${i + 1}: ${qArr[i] ?? "(no question text)"}`);
    lines.push(`A${i + 1}: ${ansArr[i] ?? "(no answer)"}`);
    lines.push("");
  }
  const transcript = lines.join("\n").slice(0, 30000);

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: QA_SYSTEM_PROMPT },
          { role: "user", content: transcript },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[scoreSubmission][qa] gateway error", res.status, body);
      throw new Error(`qa-gateway-${res.status}`);
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("qa-no-json");
    const parsed = JSON.parse(match[0]);
    const score = Number(parsed?.final_score);
    if (!Number.isFinite(score)) throw new Error("qa-bad-score");

    return {
      skipped: false,
      final_score: Math.max(0, Math.min(100, Math.round(score))),
      analysis_reasoning: String(parsed?.analysis_reasoning ?? "").slice(0, 1000),
      fallback: false,
    };
  } catch (e) {
    console.error("[scoreSubmission][qa] exception", e);
    return {
      skipped: false,
      final_score: 0,
      analysis_reasoning: "AI evaluation failed; defaulted to fallback values.",
      fallback: true,
    };
  }
}


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
      throw new Error(`gateway-${res.status}`);
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no-json");

    const parsed = JSON.parse(match[0]);
    const score = Number(parsed?.cv_score);
    if (!Number.isFinite(score)) throw new Error("bad-score");

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

  // 5. Run the QA (answers) rubric — completely separate from CV scoring.
  const qa = await runQaScoring(job?.questions ?? [], sub.answers ?? [], key);

  const qa_score = qa.skipped ? null : qa.final_score;
  const qa_analysis = qa.skipped
    ? null
    : qa.fallback
      ? {
          error: "ai-parse-or-call-failed",
          final_score: qa.final_score,
          analysis_reasoning: qa.analysis_reasoning,
          logged_at: new Date().toISOString(),
        }
      : {
          final_score: qa.final_score,
          analysis_reasoning: qa.analysis_reasoning,
        };

  const { error: updErr } = await supabaseAdmin
    .from("submissions")
    .update({
      qa_score,
      qa_analysis,
      cv_score: safeResponse.cv_score,
      cv_analysis: cvAnalysis,
      ai_reasoning: reasoningBlock,
    })
    .eq("id", submissionId);

  if (updErr) {
    console.error("[scoreSubmission] update failed:", updErr.message);
    return { ok: false as const, reason: "update-failed" };
  }

  return {
    ok: true as const,
    ...safeResponse,
    fallback: isFallback,
    qa: qa.skipped
      ? { skipped: true as const }
      : {
          skipped: false as const,
          score: qa.final_score,
          reasoning: qa.analysis_reasoning,
          fallback: qa.fallback,
        },
  };
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
