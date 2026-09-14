import { createServerFn } from "@tanstack/react-start";

const SYSTEM = `You are PXD2, a first-principles CAD kernel. The user asks for a mechanical part in plain language.
Return ONLY compact JSON (no markdown) with:
{
  "name": string,
  "width": number,
  "height": number,
  "thick": number,
  "holes": [{"x": number, "y": number, "d": number}],
  "scad": string
}
Rules:
- Millimeters in the JSON. Origin at part center. Plate in XY, thickness Z.
- Accept inches and centimeters from the user: 1 in = 25.4 mm, 1 cm = 10 mm. Convert before returning. Fractions like 1/4" or 1-1/2 in are inches.
- Prefer ISO clearance drills: M3=3.4 M4=4.5 M5=5.5 M6=6.6 M8=9.0 M10=11 M12=13.5 unless they specify otherwise.
- OpenSCAD in "scad" must compile: variables w,h,t and a difference() of a centered cube and cylinders (center=true).
- Keep parts printable. No organic sculpture. No commentary.`;

export const askPart = createServerFn({ method: "POST" })
  .validator((input: { prompt: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Grok is not available in this environment." };
    const prompt = data.prompt.trim().slice(0, 800);
    if (!prompt) return { ok: false as const, error: "Empty ask." };

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 900,
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: `xAI error ${res.status}` };
    const body = (await res.json()) as { choices: { message: { content: string } }[] };
    const raw = body.choices[0]?.message.content ?? "";
    const jsonText = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const start = jsonText.indexOf("{");
    const end = jsonText.lastIndexOf("}");
    if (start < 0 || end < 0) return { ok: false as const, error: "Grok did not return a part card." };
    try {
      const parsed = JSON.parse(jsonText.slice(start, end + 1)) as {
        name?: string;
        width?: number;
        height?: number;
        thick?: number;
        holes?: { x: number; y: number; d: number }[];
        scad?: string;
      };
      if (!parsed.width || !parsed.height || !parsed.thick) {
        return { ok: false as const, error: "Incomplete part card." };
      }
      return {
        ok: true as const,
        name: parsed.name || "part",
        width: parsed.width,
        height: parsed.height,
        thick: parsed.thick,
        holes: Array.isArray(parsed.holes) ? parsed.holes : [],
        scad: parsed.scad || "",
      };
    } catch {
      return { ok: false as const, error: "Could not parse part card." };
    }
  });
