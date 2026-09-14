import { askPart } from "@/lib/ai/ask-part";
import { parseCommand } from "./commands";
import { libMatch } from "./library";
import { askHasIntent, parseAsk } from "./intent";
import { useCad } from "./store";
import { fmtDims, unitHint } from "./units";

export async function runGrokAsk(prompt: string) {
  const { setAsking, setPart, applySentence, pushLog, cam, unit } = useCad.getState();
  const q = prompt.trim();
  if (!q) return;
  setAsking(true);
  pushLog(`Grok ← ${q}`);
  try {
    const res = await askPart({ data: { prompt: `${q}\n\n${unitHint(unit)}` } });
    if (res.ok) {
      setPart(
        {
          name: res.name,
          width: res.width,
          height: res.height,
          thick: res.thick,
          holes: res.holes,
          tiles: null,
          ask: q,
          notes: ["Grok part card"],
        },
        res.scad,
      );
      pushLog(
        `Grok → ${res.name} ${fmtDims(res.width, res.height, res.thick, unit)}, ${res.holes.length} hole(s).`,
      );
      cam("reset");
    } else {
      pushLog(res.error);
      applySentence(q);
    }
  } catch (e) {
    pushLog(e instanceof Error ? e.message : "Grok call failed.");
    applySentence(q);
  } finally {
    setAsking(false);
  }
}

export function runLocalOrGrok(prompt: string, preferGrok: boolean) {
  const q = prompt.trim();
  if (!q) return;
  if (preferGrok) return runGrokAsk(q);
  if (applyShopLocal(q)) return;
  const ask = parseAsk(q, useCad.getState().unit);
  if (askHasIntent(ask)) {
    useCad.getState().applySentence(q);
    return;
  }
  return runGrokAsk(q);
}

function applyShopLocal(q: string) {
  const cmd = parseCommand(q);
  const s = useCad.getState();
  if (cmd.t === "teeth") {
    if (cmd.set != null) s.nudgeTeeth(cmd.set - (s.part.solid?.teeth ?? 20));
    else s.nudgeTeeth(cmd.delta ?? 2);
    return true;
  }
  if (cmd.t === "compound") {
    s.compoundGears(cmd.teeth2);
    return true;
  }
  if (cmd.t === "kind") {
    s.setSolidKind(cmd.kind);
    return true;
  }
  if (cmd.t === "thicken") {
    s.thicken(cmd.delta);
    return true;
  }
  if (cmd.t === "lib") {
    const hit = libMatch(cmd.q);
    if (hit) s.dropLib(hit.id);
    return true;
  }
  return false;
}
