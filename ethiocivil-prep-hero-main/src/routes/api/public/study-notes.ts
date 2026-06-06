import { createFileRoute } from "@tanstack/react-router";

// Generates concise study notes for a course based on:
// - the user's recently attempted questions (focus areas)
// - course notes (reference text)
// Returns: { notes: [{ topic, title, content }] }
export const Route = createFileRoute("/api/public/study-notes")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }),
      POST: async ({ request }) => {
        const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
        try {
          const body = (await request.json()) as {
            courseName: string;
            topics?: string[];
            studiedQuestions: { question_text: string; correct_answer?: string; explanation?: string; topic?: string; was_correct?: boolean }[];
            referenceText?: string;
          };
          const { courseName, topics = [], studiedQuestions, referenceText } = body;
          if (!studiedQuestions?.length)
            return new Response(JSON.stringify({ error: "Practice at least one question first." }), { status: 400, headers: cors });

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: cors });

          const studiedBlock = studiedQuestions.slice(0, 40).map((q, i) =>
            `Q${i + 1} [${q.topic || "general"}] ${q.was_correct ? "✓" : "✗"}: ${q.question_text}\n  Answer: ${q.correct_answer ?? "?"}\n  Why: ${q.explanation ?? ""}`,
          ).join("\n\n");

          const refBlock = referenceText && referenceText.length > 100
            ? `\n\nCOURSE NOTES (ground notes in this material):\n---\n${referenceText.slice(0, 18000)}\n---\n`
            : "";

          const systemPrompt = `You are an Ethiopian civil engineering exit-exam tutor. Produce concise, high-yield revision notes for the topics the student just practiced in "${courseName}". Each note covers ONE topic, in markdown, 120-220 words: key formulas, definitions, common pitfalls, exam tips. Prioritize topics where the student answered incorrectly. Ground content in the provided course notes when available.`;

          const userPrompt = `Course: ${courseName}\nKnown topics: ${topics.slice(0, 12).join(", ") || "n/a"}\n\nRECENTLY PRACTICED QUESTIONS:\n${studiedBlock}${refBlock}\n\nProduce 3-6 focused revision notes.`;

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              tools: [{
                type: "function",
                function: {
                  name: "submit_notes",
                  description: "Submit revision notes.",
                  parameters: {
                    type: "object",
                    properties: {
                      notes: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            topic: { type: "string" },
                            title: { type: "string" },
                            content: { type: "string", description: "Markdown body, 120-220 words." },
                          },
                          required: ["topic", "title", "content"],
                        },
                      },
                    },
                    required: ["notes"],
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "submit_notes" } },
            }),
          });

          if (aiRes.status === 429)
            return new Response(JSON.stringify({ error: "Rate limit. Try again in a minute." }), { status: 429, headers: cors });
          if (aiRes.status === 402)
            return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: cors });
          if (!aiRes.ok) {
            const t = await aiRes.text();
            console.error("AI error", aiRes.status, t);
            return new Response(JSON.stringify({ error: "AI request failed" }), { status: 500, headers: cors });
          }

          const data = (await aiRes.json()) as any;
          const tc = data.choices?.[0]?.message?.tool_calls?.[0];
          if (!tc) return new Response(JSON.stringify({ notes: [] }), { headers: cors });
          const args = JSON.parse(tc.function.arguments);
          return new Response(JSON.stringify({ notes: args.notes ?? [] }), { headers: cors });
        } catch (e: any) {
          console.error("study-notes error", e);
          return new Response(JSON.stringify({ error: e.message || "Unknown error" }), { status: 500, headers: cors });
        }
      },
    },
  },
});
