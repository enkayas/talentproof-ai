import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  jobTitle: z.string().min(1),
  jobDescription: z.string().min(1),
});

const SYSTEM_PROMPT = `You are an elite HR consultant specializing in non-technical, creative, and humanities roles. Analyze the provided Job Title and Job Description. Generate exactly 5 interview questions tailored to the role, with a deliberate MIX of depth:

- 2 deep, situational/scenario questions that test real competency, critical thinking, or judgment in the specific domain.
- 1 practical writing or task-based prompt (e.g. draft a short note, email, or summary).
- 2 lighter, reflective questions that invite the candidate to share personal experience, motivation, or perspective. Examples (adapt to the role's domain): "Write about an experience from a prior internship that shaped how you think about this field." or "Share one thing you find genuinely interesting about [domain] beyond what's in textbooks."

Rules:
- Never use generic filler like "Tell me about yourself" or "What are your strengths and weaknesses".
- Keep each question crisp (1–3 sentences). Reflective questions should feel warm and inviting, not academic.
- Reference the role's actual domain (taken from the Job Title and Description) in at least the deep questions.

Format the output strictly as a JSON array of 5 strings: ["q1", "q2", "q3", "q4", "q5"]. No prose, no keys, no markdown fences.`;

const FALLBACK = [
  "Walk me through a recent situation where you had to make a judgment call with incomplete information. What did you weigh, and what would you do differently?",
  "Draft a 3–4 sentence note you'd send to a senior teammate explaining a tricky finding from your work this week.",
  "Write about an experience from a prior internship or project that genuinely shaped how you think about this field.",
  "Share one thing you find interesting about this domain that most people overlook — and why it matters to you.",
  "Describe a piece of work or writing you're proud of. What made it land?",
];

export const generateQuestions = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { questions: FALLBACK, fallback: true };

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
            {
              role: "user",
              content: `Job Title: ${data.jobTitle}\n\nJob Description:\n${data.jobDescription}`,
            },
          ],
        }),
      });

      if (!res.ok) return { questions: FALLBACK, fallback: true };
      const json = await res.json();
      const content: string = json?.choices?.[0]?.message?.content ?? "";
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) return { questions: FALLBACK, fallback: true };
      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return { questions: FALLBACK, fallback: true };
      }
      return {
        questions: parsed.slice(0, 4).map((q) => String(q)),
        fallback: false,
      };
    } catch {
      return { questions: FALLBACK, fallback: true };
    }
  });
