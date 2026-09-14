import type { Fit } from "./fasteners";
import type { CamOp, Tab } from "./store";
import type { Unit } from "./units";

export type Cmd =
  | { t: "cam"; op: CamOp }
  | { t: "compile" }
  | { t: "export"; fmt: "stl" | "dxf" | "scad" | "cq" | "fc" | "blend" | "json" }
  | { t: "peg" }
  | { t: "snapshot" }
  | { t: "fastener"; spec: string; fit: Fit }
  | { t: "units"; unit: Unit }
  | { t: "align" }
  | { t: "clean" }
  | { t: "merge-scans" }
  | { t: "demo-scans" }
  | { t: "teeth"; delta?: number; set?: number }
  | { t: "compound"; teeth2?: number }
  | { t: "kind"; kind: "spur" | "herringbone" | "bevel" | "rack" | "pulley" }
  | { t: "thicken"; delta: number }
  | { t: "lib"; q: string }
  | { t: "paint"; op: "stamp" | "stack" | "erase" | "raise" | "lower" | "restack" | "demo" | "clear" | "flip" | "rotate" }
  | { t: "tool"; tool: "select" | "stamp" | "stack" | "move" | "erase" }
  | { t: "snap"; snap: number }
  | { t: "laser"; on: boolean }
  | { t: "laser-align" }
  | { t: "shop"; text: string }
  | { t: "things"; q: string }
  | { t: "stamp-thing"; q: string }
  | { t: "ask"; text: string }
  | { t: "generate"; text: string }
  | { t: "tab"; tab: Tab }
  | { t: "stop-voice" }
  | { t: "time" }
  | { t: "date" }
  | { t: "refused"; reason: string };

const OS_BLOCK =
  /shutdown|restart computer|open notepad|open browser|list running processes|type now|google\.com|os\.system/;

export function parseCommand(raw: string): Cmd {
  const text = raw.toLowerCase().trim();
  if (!text) return { t: "ask", text: raw };

  if (OS_BLOCK.test(text) || text.includes("shut down") || text.includes("open notepad")) {
    return { t: "refused", reason: "PXD2 stays in CAD — it does not control the host OS." };
  }

  if (/(stop|exit|quit).*(assistant|voice)|stop listening/.test(text)) return { t: "stop-voice" };
  if (/what time|current time/.test(text)) return { t: "time" };
  if (/today'?s date|what(?: is|'s) the date/.test(text)) return { t: "date" };

  if (
    /^(?:use |switch to |set |display )?(?:inches|inch|imperial)\s*$/.test(text) ||
    /\b(?:use|switch to|set|display)\s+(?:inches|inch|imperial)\b/.test(text)
  ) {
    return { t: "units", unit: "in" };
  }
  if (
    /^(?:use |switch to |set |display )?(?:centimet(?:er|re)s?|cm)\s*$/.test(text) ||
    /\b(?:use|switch to|set|display)\s+(?:centimet(?:er|re)s?|cm)\b/.test(text)
  ) {
    return { t: "units", unit: "cm" };
  }
  if (
    /^(?:use |switch to |set |display )?(?:millimet(?:er|re)s?|mm|metric)\s*$/.test(text) ||
    /\b(?:use|switch to|set|display)\s+(?:millimet(?:er|re)s?|mm|metric)\b/.test(text)
  ) {
    return { t: "units", unit: "mm" };
  }

  if (/zoom in|closer/.test(text)) return { t: "cam", op: "zoomin" };
  if (/zoom out|farther/.test(text)) return { t: "cam", op: "zoomout" };
  if (/reset (?:view|camera)|home view|frame/.test(text)) return { t: "cam", op: "reset" };
  if (/rotate (?:right|clockwise)/.test(text)) return { t: "cam", op: "rotcw" };
  if (/rotate (?:left|counter)/.test(text)) return { t: "cam", op: "rotccw" };

  if (/peg split|split (?:it |the )?(?:for )?(?:the )?(?:printer|bed|k2)/.test(text)) return { t: "peg" };
  if (/auto-?align|align scans|align plies/.test(text)) return { t: "align" };
  if (/grok clean|clean scans|clean the cloud/.test(text)) return { t: "clean" };
  if (/merge (?:scans|plies|fill)/.test(text)) return { t: "merge-scans" };
  if (/demo (?:dual )?scan/.test(text)) return { t: "demo-scans" };
  if (/to stl|export scan|scan to stl/.test(text)) return { t: "export", fmt: "stl" };
  if (/snapshot|save revision|checkpoint/.test(text)) return { t: "snapshot" };
  if (/compile|preview script|generate(?: 3d)? model$/.test(text)) return { t: "compile" };

  const fmt =
    /export (?:to )?stl|save stl/.test(text)
      ? "stl"
      : /export (?:to )?dxf/.test(text)
        ? "dxf"
        : /export (?:to )?(?:openscad|scad)/.test(text)
          ? "scad"
          : /cadquery/.test(text)
            ? "cq"
            : /freecad/.test(text)
              ? "fc"
              : /blender/.test(text)
                ? "blend"
                : /export json|part card/.test(text)
                  ? "json"
                  : /export/.test(text)
                    ? "stl"
                    : null;
  if (fmt) return { t: "export", fmt };

  const fit: Fit = /\btap\b|\bthread/.test(text)
    ? "tap"
    : /\bclose\b|\btight\b/.test(text)
      ? "close"
      : /\bloose\b/.test(text)
        ? "loose"
        : "normal";
  const fm = text.match(/\bm\s*(3|4|5|6|8|10|12)\b/);
  if (fm && /fastener|drill|clearance|tap|holes?/.test(text) && !/\d+\s*x\s*\d+/.test(text)) {
    return { t: "fastener", spec: "m" + fm[1], fit };
  }

  if (/voice tab|open voice/.test(text)) return { t: "tab", tab: "voice" };
  if (/hand|gesture/.test(text) && /tab|open|start/.test(text)) return { t: "tab", tab: "gesture" };
  if (/convert tab/.test(text)) return { t: "tab", tab: "convert" };
  if (/iterate tab|revisions?/.test(text)) return { t: "tab", tab: "iterate" };
  if (/parts tab|library tab|open library/.test(text)) return { t: "tab", tab: "library" };
  if (/thingiverse|things tab|premade/.test(text)) {
    const q = text.replace(/^(?:search )?(?:on )?(?:thingiverse|things|premade)(?: tab)?(?: for)?\s*/i, "").trim();
    return { t: "things", q };
  }
  if (/scans? tab|open scans|scan tray/.test(text)) return { t: "tab", tab: "files" };

  if (/demo (?:stack|assembly)/.test(text)) return { t: "paint", op: "demo" };
  if (/restack/.test(text)) return { t: "paint", op: "restack" };
  if (/clear (?:stack|layers|assembly)/.test(text)) return { t: "paint", op: "clear" };
  if (/^(?:stack|stack it|stack the brush|on top)$/.test(text)) return { t: "paint", op: "stack" };
  if (/^(?:stamp|stamp it|place it|paint it|stamp the brush)$/.test(text)) return { t: "paint", op: "stamp" };
  if (/erase (?:layer|part|it)|delete layer/.test(text)) return { t: "paint", op: "erase" };
  if (/bring forward|raise layer|^raise$/.test(text)) return { t: "paint", op: "raise" };
  if (/send back|lower layer|^lower$/.test(text)) return { t: "paint", op: "lower" };
  if (/^(?:flip|flip it|flip the part)$/.test(text)) return { t: "paint", op: "flip" };
  if (/^(?:rotate|rotate it|rotate 90|turn it)$/.test(text)) return { t: "paint", op: "rotate" };
  if (/select tool|arrow tool/.test(text)) return { t: "tool", tool: "select" };
  if (/stamp tool|paint tool/.test(text)) return { t: "tool", tool: "stamp" };
  if (/stack tool/.test(text)) return { t: "tool", tool: "stack" };
  if (/move tool/.test(text)) return { t: "tool", tool: "move" };
  if (/erase tool/.test(text)) return { t: "tool", tool: "erase" };
  if (/snap (?:to )?(?:peg )?20/.test(text)) return { t: "snap", snap: 20 };
  if (/snap (?:to )?5/.test(text)) return { t: "snap", snap: 5 };
  if (/snap (?:to )?1/.test(text)) return { t: "snap", snap: 1 };
  if (/^(?:hide lasers?|laser off|no lasers?)$/.test(text)) return { t: "laser", on: false };
  if (/^(?:laser(?:s)?(?: level)?(?: tool)?|show lasers?|laser on)$/.test(text)) return { t: "laser", on: true };
  if (/align (?:the )?holes|laser align|align to (?:the )?lasers?/.test(text)) return { t: "laser-align" };

  const setTeeth = text.match(/(?:set |make )?(?:the )?teeth (?:to |at )?(\d+)/);
  if (setTeeth) return { t: "teeth", set: Number(setTeeth[1]) };
  if (/(increase|add|more) teeth|add a tooth/.test(text)) {
    const n = text.match(/(\d+)/);
    return { t: "teeth", delta: n ? Number(n[1]) : 2 };
  }
  if (/(reduce|fewer|less|remove|drop) teeth/.test(text)) {
    const n = text.match(/(\d+)/);
    return { t: "teeth", delta: -(n ? Number(n[1]) : 2) };
  }
  const comp = text.match(/compound(?:\s+(?:with|and|to))?\s*(\d+)?/);
  if (comp && /compound/.test(text)) return { t: "compound", teeth2: comp[1] ? Number(comp[1]) : undefined };
  if (/herringbone/.test(text)) return { t: "kind", kind: "herringbone" };
  if (/\bbevel\b/.test(text) && /gear|make|into/.test(text)) return { t: "kind", kind: "bevel" };
  if (/make (?:it |this )?(?:a )?spur/.test(text)) return { t: "kind", kind: "spur" };
  if (/thicker|increase thickness/.test(text)) return { t: "thicken", delta: 2 };
  if (/thinner|reduce thickness/.test(text)) return { t: "thicken", delta: -2 };

  const lib = text.match(/(?:load|drop|insert|get|open part|library)\s+(.+)/);
  if (lib) return { t: "lib", q: lib[1].trim() };
  const stampThing = text.match(/stamp (?:a |the )?(?:thing )?(.+)/);
  if (stampThing && !/brush|it$/.test(stampThing[1])) return { t: "stamp-thing", q: stampThing[1].trim() };

  if (/^(?:grok|generate|make me|design|build me)\b/.test(text) || /\bwith grok\b/.test(text)) {
    return { t: "generate", text: raw.trim() };
  }
  if (/^(?:pxd2|beni|shop|hey beni|hey pxd2|please)\b/.test(text)) return { t: "shop", text: raw.trim() };
  return { t: "shop", text: raw.trim() };
}
