import { createFileRoute } from "@tanstack/react-router";

// Accepts: { text, mode: "extract" | "generate", courses: [{slug,name,topics?}], countPerChunk? }
// Returns: { questions: [{ ...mcq, course_slug, topic, difficulty, explanation }] }
export const Route = createFileRoute("/api/public/pdf-questions")({
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
            text: string;
            mode: "extract" | "generate";
            courses: { slug: string; name: string; topics?: string[] }[];
            countPerChunk?: number;
            referenceText?: string;
          };
          const { text, mode, courses, referenceText } = body;
          if (!text || text.length < 50)
            return new Response(JSON.stringify({ error: "Text too short" }), { status: 400, headers: cors });
          if (!courses?.length)
            return new Response(JSON.stringify({ error: "Course list required" }), { status: 400, headers: cors });

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey)
            return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: cors });

          // Chunk to ~12k chars to stay within token budgets but still get meaningful coverage
          const chunkSize = 12000;
          const chunks: string[] = [];
          for (let i = 0; i < text.length; i += chunkSize) chunks.push(text.slice(i, i + chunkSize));
          // Cap to first 6 chunks (~72k chars) to keep runtime reasonable
          const limited = chunks.slice(0, 6);

          const courseList = courses
            .map((c) => `- "${c.slug}": ${c.name}${c.topics?.length ? ` (topics: ${c.topics.slice(0, 8).join(", ")})` : ""}`)
            .join("\n");

          const systemPrompt =
            mode === "extract"
              ? `You are an expert Ethiopian Civil Engineering exit-exam analyst. The user pasted text extracted from a past-exam PDF. Find every multiple-choice question in the text. For each: write a clean question, exactly 4 options (A-D), the correct answer (infer from the answer key if present, otherwise from the COURSE NOTES context if provided, otherwise from your subject knowledge), and a detailed explanation. When COURSE NOTES are provided, ground your explanation in those notes and cite the relevant concept. Also output difficulty, the best-fit course slug from the provided list, and a topic. Skip headers, instructions, page numbers, and non-question prose. Output ONLY MCQs you are confident about.`
              : `You are an exam question writer for Ethiopian Civil Engineering exit exams. The user pasted text from a course notes PDF. Generate rigorous MCQs that test understanding of this material. For each: clean question, 4 options (A-D), correct answer, clear explanation grounded in the notes, difficulty, the best-fit course slug from the provided list, and a topic.`;

          const refBlock = referenceText && referenceText.length > 100
            ? `\n\nCOURSE NOTES (use to determine answers and explanations):\n---\n${referenceText.slice(0, 18000)}\n---\n`
            : "";

          const allQuestions: any[] = [];

          for (const chunk of limited) {
            const userPrompt = `Available course slugs (choose the SINGLE best-fit slug per question):\n${courseList}\n${refBlock}\n${
              mode === "extract"
                ? "Extract every MCQ from this past-exam text:"
                : `Generate ${body.countPerChunk ?? 6} MCQs from this notes text, spread across topics covered:`
            }\n\n---\n${chunk}\n---`;

            const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
                tools: [
                  {
                    type: "function",
                    function: {
                      name: "submit_questions",
                      description: "Submit categorized MCQs.",
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
                                course_slug: { type: "string", enum: courses.map((c) => c.slug) },
                                topic: { type: "string" },
                              },
                              required: [
                                "question_text",
                                "option_a",
                                "option_b",
                                "option_c",
                                "option_d",
                                "correct_answer",
                                "explanation",
                                "difficulty",
                                "course_slug",
                                "topic",
                              ],
                            },
                          },
                        },
                        required: ["questions"],
                      },
                    },
                  },
                ],
                tool_choice: { type: "function", function: { name: "submit_questions" } },
              }),
            });

            if (aiRes.status === 429)
              return new Response(JSON.stringify({ error: "Rate limit. Try again in a minute." }), {
                status: 429,
                headers: cors,
              });
            if (aiRes.status === 402)
              return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: cors });
            if (!aiRes.ok) {
              console.error("AI error", aiRes.status, await aiRes.text());
              continue;
            }
            const data = (await aiRes.json()) as any;
            const tc = data.choices?.[0]?.message?.tool_calls?.[0];
            if (!tc) continue;
            try {
              const args = JSON.parse(tc.function.arguments);
              if (Array.isArray(args.questions)) allQuestions.push(...args.questions);
            } catch (e) {
              console.error("parse args failed", e);
            }
          }

          return new Response(
            JSON.stringify({ questions: allQuestions, chunks_processed: limited.length, total_chunks: chunks.length }),
            { headers: cors },
          );
        } catch (e: any) {
          console.error("pdf-questions error:", e);
          return new Response(JSON.stringify({ error: e.message || "Unknown error" }), { status: 500, headers: cors });
        }
      },
    },
  },
});
