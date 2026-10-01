import { isAiSuggestion, isAiSuggestionFacts, pickAiSuggestionFacts } from "@/features/renewal-detail/ai-suggestion";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: true }, { status: 400 });
  }
  if (!isAiSuggestionFacts(body)) return Response.json({ error: true }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return Response.json({ error: true }, { status: 503 });

  const facts = pickAiSuggestionFacts(body);
  const prompt = [
    "You are Bruno, Trellis's renewal-risk decision advisor. Suggest one action for a human to review; never claim to have recorded, submitted, cancelled, renewed, or contacted anyone.",
    "Use only the supplied facts. Do not invent data, dates, names, numbers, trends, savings, vendor terms, or outcomes. Omit any unknown fact.",
    "Return one short recommendation sentence and one short reasoning sentence citing the specific supplied signals. Use plain language for people, such as '6 days past cancel-by'; never expose JSON field names. Confidence is your uncertainty estimate from 0 to 100, not a measured probability.",
    "If the cancel-by window has passed, do not imply ordinary cancellation remains guaranteed. A cancellation suggestion then means requesting goodwill cancellation, subject to vendor agreement.",
    "If daysToCancelBy is negative, choose Renew, Right-size, or Cancel so the suggestion matches the available recovery decisions.",
    "Choose exactly one action: Renew, Right-size, Cancel, or Escalate.",
    `Facts: ${JSON.stringify(facts)}`,
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
            properties: {
              action: { type: "STRING", enum: ["Renew", "Right-size", "Cancel", "Escalate"] },
              confidence: { type: "INTEGER", minimum: 0, maximum: 100 },
              recommendation: { type: "STRING" },
              reasoning: { type: "STRING" },
            },
            required: ["action", "confidence", "recommendation", "reasoning"],
          },
        },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return Response.json({ error: true }, { status: 502 });
    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    const suggestion: unknown = typeof text === "string" ? JSON.parse(text) : null;
    if (!isAiSuggestion(suggestion) || (facts.daysToCancelBy !== undefined && facts.daysToCancelBy < 0 && suggestion.action === "Escalate")) {
      return Response.json({ error: true }, { status: 502 });
    }
    return Response.json(suggestion, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: true }, { status: 502 });
  }
}
