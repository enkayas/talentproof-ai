import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  jobTitle: z.string().min(1),
  jobDescription: z.string().min(1),
});

const SYSTEM_PROMPT = `You are an elite HR consultant specializing in non-technical, creative, and humanities roles. Analyze the provided Job Title and Job Description. Generate exactly 4 highly specific, practical, situational interview questions that test real competency, critical thinking, empathy, or writing capability instead of textbook knowledge. Do not ask generic questions like 'Tell me about yourself'. Format the output strictly as a JSON array of strings: ["question 1", "question 2", "question 3", "question 4"].`;

const FALLBACK = [
  "Describe a time you had to communicate a complex idea to someone unfamiliar with the topic. How did you adapt your message?",
  "You receive conflicting feedback from two stakeholders on a piece of work. Walk us through how you'd resolve it.",
  "Write a 3-sentence response to a frustrated user complaining their issue wasn't resolved on the first contact.",
  "Pick a recent piece of writing or content you admired. What specifically made it effective?",
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
