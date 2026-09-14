import { drill, type Fit } from "./fasteners";
export type { Fit };
import type { Hole, Part } from "./types";
import { parseAskLengths, type Unit } from "./units";

export type Ask = {
  raw: string;
  holeCount: number | null;
  fastener: string | null;
  fit: Fit;
  holeDiameter: number | null;
  thickness: number | null;
  pattern: [number, number] | null;
  width: number | null;
  height: number | null;
};

export function parseAsk(text: string, displayUnit: Unit = "mm"): Ask {
  const low = text.toLowerCase();
  const ask: Ask = {
    raw: text.trim(),
    holeCount: null,
    fastener: null,
    fit: "normal",
    holeDiameter: null,
    thickness: null,
    pattern: null,
    width: null,
    height: null,
  };

  const hc = low.match(/\b(\d+)\s*(?:bolt|hole|holes|screws?|bolts?)\b/);
  if (hc) ask.holeCount = Number(hc[1]);
  else if (/\bfour\b|4-bolt|4 bolt/.test(low)) ask.holeCount = 4;
  else if (/\bsix\b/.test(low)) ask.holeCount = 6;
  else if (/\btwo\b/.test(low)) ask.holeCount = 2;
  else if (/\bone\b|\bsingle hole\b/.test(low)) ask.holeCount = 1;

  const fm = low.match(/\bm\s*(3|4|5|6|8|10|12)\b/);
  if (fm) ask.fastener = "m" + fm[1];

  if (/\bclose\b|\btight\b/.test(low)) ask.fit = "close";
  else if (/\bloose\b|\bsloppy\b/.test(low)) ask.fit = "loose";
  else if (/\btap\b|\bthread\b/.test(low)) ask.fit = "tap";

  const lens = parseAskLengths(low, displayUnit);
  ask.width = lens.width;
  ask.height = lens.height;
  ask.thickness = lens.thickness;
  ask.holeDiameter = lens.holeDiameter;
  ask.pattern = lens.pattern;

  if (ask.fastener && ask.holeDiameter == null) {
    ask.holeDiameter = drill(ask.fastener, ask.fit);
  }
  return ask;
}

export function askHasIntent(ask: Ask): boolean {
  return Boolean(
    ask.holeCount ||
      ask.fastener ||
      ask.holeDiameter ||
      ask.thickness ||
      ask.width ||
      ask.height ||
      ask.pattern,
  );
}

export function applyAsk(part: Part, ask: Ask): Part {
  const next: Part = {
    ...part,
    holes: part.holes.map((h) => ({ ...h })),
    ask: ask.raw,
    notes: [...part.notes],
    tiles: null,
    solid: null,
  };
  if (ask.width) next.width = ask.width;
  if (ask.height) next.height = ask.height;
  if (ask.thickness) next.thick = ask.thickness;
  const d = ask.holeDiameter;
  if (d) next.holes = next.holes.map((h) => ({ ...h, d }));

  const count = ask.holeCount;
  if (count === 1) {
    next.holes = [{ x: 0, y: 0, d: d ?? next.holes[0]?.d ?? 6.6 }];
  } else if (count === 2) {
    const px = ask.pattern?.[0] ?? next.width * 0.55;
    const hd = d ?? next.holes[0]?.d ?? 6.6;
    next.holes = [
      { x: -px / 2, y: 0, d: hd },
      { x: px / 2, y: 0, d: hd },
    ];
  } else if (count === 4) {
    const px = ask.pattern?.[0] ?? (next.width >= 50 ? 50 : next.width * 0.6);
    const py = ask.pattern?.[1] ?? (next.height >= 30 ? 30 : next.height * 0.5);
    const hd = d ?? 6.6;
    next.holes = [
      { x: -px / 2, y: -py / 2, d: hd },
      { x: px / 2, y: -py / 2, d: hd },
      { x: px / 2, y: py / 2, d: hd },
      { x: -px / 2, y: py / 2, d: hd },
    ];
  } else if (count === 6) {
    const px = ask.pattern?.[0] ?? next.width * 0.6;
    const py = ask.pattern?.[1] ?? next.height * 0.5;
    const hd = d ?? next.holes[0]?.d ?? 6.6;
    const xs = [-px / 2, 0, px / 2];
    const ys = [-py / 2, py / 2];
    next.holes = ys.flatMap((y) => xs.map((x) => ({ x, y, d: hd })));
  } else if (count != null && count < next.holes.length) {
    next.holes = next.holes.slice(0, count);
  }
  if (ask.fastener) next.notes = [`${ask.fastener.toUpperCase()} ${ask.fit} drill`];
  return next;
}

export function scadFromPart(part: Part): string {
  const holes = part.holes
    .map(
      (h) =>
        `  translate([${fmt(h.x)}, ${fmt(h.y)}, 0]) cylinder(h = t + 2, d = ${fmt(h.d)}, center = true);`,
    )
    .join("\n");
  return `// ${part.name} — ${fmt(part.width)} × ${fmt(part.height)} × ${fmt(part.thick)} mm
w = ${fmt(part.width)};
h = ${fmt(part.height)};
t = ${fmt(part.thick)};
difference() {
  cube([w, h, t], center = true);
${holes}
}
`;
}

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function setFastener(part: Part, spec: string, fit: Fit = "normal"): Part {
  const d = drill(spec, fit);
  if (d == null) return part;
  return {
    ...part,
    holes: part.holes.map((h) => ({ ...h, d })),
    notes: [`${spec.toUpperCase()} ${fit} = Ø${d}`],
    tiles: null,
  };
}

export function addHole(part: Part, hole: Hole): Part {
  return { ...part, holes: [...part.holes, hole], tiles: null };
}

export function removeHole(part: Part, index: number): Part {
  return { ...part, holes: part.holes.filter((_, i) => i !== index), tiles: null };
}

export function updateHole(part: Part, index: number, patch: Partial<Hole>): Part {
  return {
    ...part,
    holes: part.holes.map((h, i) => (i === index ? { ...h, ...patch } : h)),
    tiles: null,
  };
}
