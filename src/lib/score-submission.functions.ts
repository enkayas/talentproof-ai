import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({ submissionId: z.string().uuid() });

const SYSTEM_PROMPT = `You are a sharp recruiting analyst evaluating a candidate's free-form answers to an interview screener. Your job: give a single integer score from 0 to 100 and a 2-sentence justification.

Scoring rubric (be strict and discerning):
- 80–100: Specific examples, concrete reasoning, role-relevant judgment, clear voice. Earned trust.
- 50–79: Reasonable answers but generic, surface-level, or partly off-topic. Average.
- 0–49: Vague, padded, dodges the question, or reads as AI-generated boilerplate / heavy fluff.

Penalize: empty buzzwords ("synergy", "passionate about excellence"), AI-sounding generic structure, padded prose with no specifics, copy-paste resume bullets that ignore the question.
Reward: concrete numbers, named projects, lived examples, original framing, judgment under ambiguity.

Respond ONLY with strict JSON of shape: {"score": <int 0-100>, "reasoning": "<two short sentences>"}. No prose, no markdown fences.`;

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
      const s = Number(parsed?.score);
      if (!Number.isFinite(s)) return { ok: false as const, reason: "bad-score" };
      score = Math.max(0, Math.min(100, Math.round(s)));
      reasoning = String(parsed?.reasoning ?? "").slice(0, 600);
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
