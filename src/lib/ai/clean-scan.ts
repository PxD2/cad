import { createServerFn } from "@tanstack/react-start";

const SYSTEM = `You clean 3D scanner point clouds (Revopoint POP-class). The user sends bbox mm, point count, and a flattened occupancy grid (6×6×4, X then Y then Z).
Return ONLY compact JSON:
{"voxel": number, "stdMul": number, "fill": boolean, "note": string}
Rules:
- voxel 0.4–2.0 mm. Noisier / sparser → larger voxel.
- stdMul 1.1–2.0 (statistical outlier, k=6). More flyers → smaller stdMul (stricter).
- fill true if empty fraction > 0.25 (morphological close to patch holes from a second ply).
- note: one short shop sentence. No markdown.`;

export const cleanScan = createServerFn({ method: "POST" })
  .validator((input: { n: number; empty: number; bbox: number[]; bins: number[] }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Grok is not available in this environment." };
    const n = Math.max(0, Math.min(data.n, 2_000_000));
    const empty = Math.max(0, Math.min(1, data.empty));
    const bbox = data.bbox.slice(0, 6).map((v) => Number(v) || 0);
    const bins = data.bins.slice(0, 144).map((v) => Math.max(0, Math.round(Number(v) || 0)));
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 180,
        temperature: 0.15,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: JSON.stringify({ n, empty: Number(empty.toFixed(3)), bbox, bins }),
          },
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: `xAI error ${res.status}` };
    const body = (await res.json()) as { choices: { message: { content: string } }[] };
    const raw = body.choices[0]?.message.content ?? "";
    const jsonText = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const start = jsonText.indexOf("{");
    const end = jsonText.lastIndexOf("}");
    if (start < 0 || end < 0) return { ok: false as const, error: "Grok did not return a clean card." };
    try {
      const parsed = JSON.parse(jsonText.slice(start, end + 1)) as {
        voxel?: number;
        stdMul?: number;
        fill?: boolean;
        note?: string;
      };
      const voxel = clamp(parsed.voxel ?? 0.8, 0.4, 2);
      const stdMul = clamp(parsed.stdMul ?? 1.4, 1.1, 2);
      return {
        ok: true as const,
        voxel,
        stdMul,
        fill: parsed.fill !== false,
        note: (parsed.note || "Cleaned.").slice(0, 180),
      };
    } catch {
      return { ok: false as const, error: "Could not parse clean card." };
    }
  });

function clamp(n: number, a: number, b: number) {
  if (!Number.isFinite(n)) return a;
  return Math.min(b, Math.max(a, n));
}
