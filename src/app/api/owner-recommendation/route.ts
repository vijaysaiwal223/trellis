import { describeOwner, isOwnerRecommendationRequest } from "@/features/renewal-detail/owner-recommendation";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: true }, { status: 400 });
  }
  if (!isOwnerRecommendationRequest(body)) return Response.json({ error: true }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return Response.json({ error: true }, { status: 503 });

  const prompt = [
    "You are Bruno, Trellis's owner assignment advisor. Recommend exactly one eligible person for a human to review.",
    "Use only the supplied facts. Team, current Trellis renewal count, related renewal count, and existing candidate order are signals, not proof of expertise or availability.",
    "Prefer relevant existing ownership, reasonable workload, and the candidate order when evidence is otherwise tied. Do not invent skills, relationships, capacity, performance, or past work.",
    "Return only the selected eligible name. The application will explain the choice using verified data.",
    `Facts: ${JSON.stringify(body)}`,
  ].join("\n");

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: { name: { type: "STRING" } },
            required: ["name"],
          },
        },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return Response.json({ error: true }, { status: 502 });
    const result = await response.json();
    const answer = JSON.parse(result?.candidates?.[0]?.content?.parts?.[0]?.text ?? "null") as unknown;
    if (!answer || typeof answer !== "object") return Response.json({ error: true }, { status: 502 });
    const recommendation = answer as { name?: unknown };
    const person = body.candidates.find((candidate) => candidate.name === recommendation.name);
    if (
      typeof recommendation.name !== "string" ||
      !person
    ) return Response.json({ error: true }, { status: 502 });
    return Response.json({ name: recommendation.name, reason: describeOwner(body, person) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: true }, { status: 502 });
  }
}
