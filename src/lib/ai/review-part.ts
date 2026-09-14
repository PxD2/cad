import { createServerFn } from "@tanstack/react-start";

const SYSTEM = `You are PXD2's Reviewer desk. The user ships a mechanical part card in millimeters (mm).
Return a short punch list (max 8 lines). Call out: bed fit vs 340×340×345 K2 Plus usable,
hole-to-edge gaps under 1.5× diameter, missing fasteners, thickness too thin for the span.
If it is sound, say so in one line, then one print tip. No JSON. No markdown headings.`;

export const reviewPart = createServerFn({ method: "POST" })
  .validator((input: { card: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Grok is not available in this environment." };
    const card = data.card.trim().slice(0, 1200);
    if (!card) return { ok: false as const, error: "Empty card." };
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 350,
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: card },
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: `xAI error ${res.status}` };
    const body = (await res.json()) as { choices: { message: { content: string } }[] };
    const text = (body.choices[0]?.message.content ?? "").trim();
    if (!text) return { ok: false as const, error: "Empty review." };
    return { ok: true as const, text };
  });
