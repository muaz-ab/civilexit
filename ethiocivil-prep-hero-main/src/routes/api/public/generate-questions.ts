import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/generate-questions")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, {
        status: 204,
        headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" },
      }),
      POST: async ({ request }) => {
        const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
        try {
          const { text, count = 5, topic } = await request.json() as { text: string; count?: number; topic?: string };
          if (!text || text.length < 50) return new Response(JSON.stringify({ error: "Text too short" }), { status: 400, headers: cors });

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: cors });

          const systemPrompt = `You are an exam question writer for Ethiopian Civil Engineering exit exams. Generate rigorous, exam-quality MCQs from the source material provided. Each question must have exactly 4 options (A, B, C, D), one unambiguous correct answer, and a clear explanation. Avoid trick questions; test understanding.`;

          const userPrompt = `Generate exactly ${Math.min(15, Math.max(1, count))} MCQs from this source material${topic ? ` about "${topic}"` : ""}.\n\nSource:\n${text.slice(0, 8000)}`;

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
                  name: "submit_questions",
                  description: "Submit the generated MCQ questions.",
                  parameters: {
                    type: "object",
                    properties: {
                      questions: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            question_text: { type: "string" },
                            option_a: { type: "string" },
                            option_b: { type: "string" },
                            option_c: { type: "string" },
                            option_d: { type: "string" },
                            correct_answer: { type: "string", enum: ["A", "B", "C", "D"] },
                            explanation: { type: "string" },
                            difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                            topic: { type: "string" },
                          },
                          required: ["question_text", "option_a", "option_b", "option_c", "option_d", "correct_answer", "explanation", "difficulty"],
                        },
                      },
                    },
                    required: ["questions"],
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "submit_questions" } },
            }),
          });

          if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again in a minute." }), { status: 429, headers: cors });
          if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace usage." }), { status: 402, headers: cors });
          if (!aiRes.ok) return new Response(JSON.stringify({ error: `AI error ${aiRes.status}` }), { status: 500, headers: cors });

          const data = await aiRes.json() as any;
          const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
          if (!toolCall) return new Response(JSON.stringify({ error: "No questions generated" }), { status: 500, headers: cors });
          const args = JSON.parse(toolCall.function.arguments);
          return new Response(JSON.stringify({ questions: args.questions }), { headers: cors });
        } catch (e: any) {
          console.error("generate-questions error:", e);
          return new Response(JSON.stringify({ error: e.message || "Unknown error" }), { status: 500, headers: cors });
        }
      },
    },
  },
});
