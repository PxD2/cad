import { parseCommand } from "./commands";
import { downloadPayload, type OutFmt } from "./io";
import { libMatch } from "./library";
import { runGrokAsk, runLocalOrGrok } from "./run-ask";
import { runGrokClean } from "./run-clean";
import { runShop } from "./run-shop";
import { useCad } from "./store";
import { searchThings } from "./thingiverse";
import { UNIT_NAME } from "./units";

export function dispatchVoice(raw: string, stopVoice?: () => void) {
  const cmd = parseCommand(raw);
  const s = useCad.getState();
  switch (cmd.t) {
    case "cam":
      s.cam(cmd.op);
      s.pushLog(`Camera ${cmd.op}`);
      speak(`Camera ${cmd.op}`);
      return;
    case "compile":
      s.compile();
      speak("Compiled.");
      return;
    case "export":
      downloadPayload(s.part, s.scad, cmd.fmt as OutFmt);
      s.pushLog(`Exported ${cmd.fmt}`);
      speak("Exported.");
      return;
    case "peg":
      s.pegSplit();
      speak(s.part.tiles ? "Split for the printer." : "Already fits.");
      return;
    case "snapshot":
      s.snapshot("voice");
      speak("Revision saved.");
      return;
    case "fastener":
      s.fastener(cmd.spec, cmd.fit);
      speak(`${cmd.spec} ${cmd.fit}`);
      return;
    case "units":
      s.setUnit(cmd.unit);
      speak(UNIT_NAME[cmd.unit]);
      return;
    case "align":
      s.alignScans();
      speak("Aligned.");
      return;
    case "clean":
      void runGrokClean();
      speak("Cleaning.");
      return;
    case "merge-scans":
      s.mergeScans();
      speak("Merged.");
      return;
    case "demo-scans":
      s.loadDemoScans();
      speak("Demo scans on the tray.");
      return;
    case "teeth":
      if (cmd.set != null) s.nudgeTeeth(cmd.set - (s.part.solid?.teeth ?? 20));
      else s.nudgeTeeth(cmd.delta ?? 2);
      speak(`${s.part.solid?.teeth ?? ""} teeth`);
      return;
    case "compound":
      s.compoundGears(cmd.teeth2);
      speak("Compound gear.");
      return;
    case "kind":
      s.setSolidKind(cmd.kind);
      speak(cmd.kind);
      return;
    case "thicken":
      s.thicken(cmd.delta);
      speak("Thickness updated.");
      return;
    case "lib": {
      const hit = libMatch(cmd.q);
      if (hit) {
        s.dropLib(hit.id);
        speak(hit.name);
      } else {
        s.pushLog(`No library match for ${cmd.q}`);
        speak("Not in the library.");
      }
      return;
    }
    case "paint":
      if (cmd.op === "stamp") s.stampAt();
      else if (cmd.op === "stack") s.stackAt();
      else if (cmd.op === "erase") s.eraseInst();
      else if (cmd.op === "raise") s.raiseInst();
      else if (cmd.op === "lower") s.lowerInst();
      else if (cmd.op === "flip") s.flipSel(90);
      else if (cmd.op === "rotate") s.rotateSel(90);
      else if (cmd.op === "restack") s.restack();
      else if (cmd.op === "clear") s.clearStack();
      else s.loadDemoStack();
      speak(cmd.op);
      return;
    case "tool":
      s.setTool(cmd.tool);
      speak(cmd.tool);
      return;
    case "snap":
      s.setSnap(cmd.snap);
      speak(`Snap ${cmd.snap}`);
      return;
    case "laser":
      s.setLaserOn(cmd.on);
      speak(cmd.on ? "Laser on." : "Laser off.");
      return;
    case "laser-align":
      s.alignLasers();
      speak("Aligned to the laser.");
      return;
    case "easy-belt":
      s.loadEasyBelt();
      speak("Easy GT2 belt.");
      return;
    case "belt-pair":
      s.beltPair();
      speak("Belt on.");
      return;
    case "kit":
      s.loadKit(cmd.q);
      speak(cmd.q);
      return;
    case "things":
      s.setLibSource("tv");
      s.setThingsQuery(cmd.q);
      speak("Thingiverse");
      return;
    case "stamp-thing": {
      const hit = searchThings(cmd.q)[0];
      if (hit) {
        s.stampThing(hit);
        speak(hit.name);
      } else speak("No match.");
      return;
    }
    case "shop":
      void runShop(cmd.text);
      return;
    case "tab":
      s.setTab(cmd.tab);
      return;
    case "stop-voice":
      stopVoice?.();
      speak("Assistant off.");
      return;
    case "time":
      s.pushLog(new Date().toLocaleTimeString());
      speak(new Date().toLocaleTimeString());
      return;
    case "date":
      s.pushLog(new Date().toLocaleDateString());
      speak(new Date().toLocaleDateString());
      return;
    case "refused":
      s.pushLog(cmd.reason);
      speak("No.");
      return;
    case "generate":
      void runGrokAsk(cmd.text);
      return;
    case "ask":
      void runLocalOrGrok(cmd.text, false);
      return;
  }
}

export function speak(text: string) {
  try {
    const syn = window.speechSynthesis;
    if (!syn) return;
    syn.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    u.pitch = 1;
    syn.speak(u);
  } catch {
    /* ignore */
  }
}
