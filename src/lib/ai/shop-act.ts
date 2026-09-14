import { createServerFn } from "@tanstack/react-start";

const SYSTEM = `You are PXD2, a shop CAD partner sitting next to the user. They talk in plain language.
You receive the current part JSON and an utterance. Return ONLY compact JSON:
{
  "op": "teeth"|"compound"|"kind"|"part"|"lib"|"thicken"|"say",
  "delta": number,
  "teeth": number,
  "teeth2": number,
  "kind": "spur"|"herringbone"|"bevel"|"rack"|"pulley"|"compound",
  "lib": string,
  "note": string,
  "name": string,
  "width": number,
  "height": number,
  "thick": number,
  "holes": [{"x":number,"y":number,"d":number}],
  "scad": string
}
Rules:
- Prefer op teeth/compound/kind/thicken/lib when they are editing the live part.
- op part only when they want a NEW plate or a different object (include width/height/thick mm).
- Increase/reduce teeth → op teeth with delta (+2 or -2 default).
- Compound gear → op compound. Optional teeth2 for the large gear.
- Millimeters. ISO drills M3=3.4 M4=4.5 M5=5.5 M6=6.6 M8=9 M10=11.
- note: one short shop sentence. No markdown.`;

export type ShopCard = {
  op?: string;
  delta?: number;
  teeth?: number;
  teeth2?: number;
  kind?: string;
  lib?: string;
  note?: string;
  name?: string;
  width?: number;
  height?: number;
  thick?: number;
  holes?: { x: number; y: number; d: number }[];
  scad?: string;
};

export const shopAct = createServerFn({ method: "POST" })
  .validator((input: { prompt: string; part: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Grok is not available in this environment." };
    const prompt = data.prompt.trim().slice(0, 600);
    if (!prompt) return { ok: false as const, error: "Empty ask." };
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 700,
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `PART:\n${data.part.slice(0, 900)}\n\nUSER:\n${prompt}` },
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: `xAI error ${res.status}` };
    const body = (await res.json()) as { choices: { message: { content: string } }[] };
    const raw = body.choices[0]?.message.content ?? "";
    const jsonText = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const start = jsonText.indexOf("{");
    const end = jsonText.lastIndexOf("}");
    if (start < 0 || end < 0) return { ok: false as const, error: "Grok did not return a shop card." };
    try {
      const parsed = JSON.parse(jsonText.slice(start, end + 1)) as ShopCard;
      const act: ShopCard = {
        op: typeof parsed.op === "string" ? parsed.op : "say",
        delta: typeof parsed.delta === "number" ? parsed.delta : undefined,
        teeth: typeof parsed.teeth === "number" ? parsed.teeth : undefined,
        teeth2: typeof parsed.teeth2 === "number" ? parsed.teeth2 : undefined,
        kind: typeof parsed.kind === "string" ? parsed.kind : undefined,
        lib: typeof parsed.lib === "string" ? parsed.lib : undefined,
        note: typeof parsed.note === "string" ? parsed.note.slice(0, 180) : undefined,
        name: typeof parsed.name === "string" ? parsed.name : undefined,
        width: typeof parsed.width === "number" ? parsed.width : undefined,
        height: typeof parsed.height === "number" ? parsed.height : undefined,
        thick: typeof parsed.thick === "number" ? parsed.thick : undefined,
        holes: Array.isArray(parsed.holes) ? parsed.holes : undefined,
        scad: typeof parsed.scad === "string" ? parsed.scad : undefined,
      };
      return { ok: true as const, act };
    } catch {
      return { ok: false as const, error: "Could not parse shop card." };
    }
  });
