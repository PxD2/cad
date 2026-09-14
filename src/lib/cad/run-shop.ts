import { shopAct, type ShopCard } from "@/lib/ai/shop-act";
import { libMatch } from "./library";
import { useCad } from "./store";

export async function runShop(prompt: string) {
  const s = useCad.getState();
  const q = prompt.trim();
  if (!q) return;
  s.setAsking(true);
  s.pushLog(`PXD2 ← ${q}`);
  try {
    const part = s.part;
    const res = await shopAct({
      data: {
        prompt: q,
        part: JSON.stringify({
          name: part.name,
          width: part.width,
          height: part.height,
          thick: part.thick,
          holes: part.holes,
          solid: part.solid ?? null,
        }),
      },
    });
    if (!res.ok) {
      s.pushLog(res.error);
      s.applySentence(q);
      return;
    }
    applyAct(res.act);
  } catch (e) {
    s.pushLog(e instanceof Error ? e.message : "Shop call failed.");
    s.applySentence(q);
  } finally {
    useCad.getState().setAsking(false);
  }
}

function applyAct(act: ShopCard) {
  const s = useCad.getState();
  const op = String(act.op || "say");
  const note = typeof act.note === "string" ? act.note : "";
  if (note) {
    s.setReview(note);
    s.pushLog(note);
  }
  if (op === "teeth") {
    if (typeof act.teeth === "number") s.nudgeTeeth(act.teeth - (s.part.solid?.teeth ?? 20));
    else s.nudgeTeeth(typeof act.delta === "number" ? act.delta : 2);
    return;
  }
  if (op === "compound") {
    s.compoundGears(typeof act.teeth2 === "number" ? act.teeth2 : undefined);
    return;
  }
  if (op === "kind" && typeof act.kind === "string") {
    const k = act.kind as "spur" | "herringbone" | "bevel" | "rack" | "pulley";
    s.setSolidKind(k);
    return;
  }
  if (op === "thicken") {
    s.thicken(typeof act.delta === "number" ? act.delta : 2);
    return;
  }
  if (op === "lib" && typeof act.lib === "string") {
    const hit = libMatch(act.lib);
    if (hit) s.dropLib(hit.id);
    return;
  }
  if (op === "part" && typeof act.width === "number" && typeof act.height === "number") {
    s.setPart(
      {
        name: String(act.name || "part"),
        width: Number(act.width),
        height: Number(act.height),
        thick: Number(act.thick) || 6,
        holes: Array.isArray(act.holes) ? (act.holes as { x: number; y: number; d: number }[]) : [],
        tiles: null,
        ask: note || "shop",
        notes: ["Grok shop"],
        solid: null,
      },
      typeof act.scad === "string" ? act.scad : "",
    );
    s.cam("reset");
  }
}
