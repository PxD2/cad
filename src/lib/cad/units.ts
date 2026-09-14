export type Unit = "mm" | "cm" | "in";

export const UNITS: Unit[] = ["mm", "cm", "in"];

export const UNIT_LABEL: Record<Unit, string> = {
  mm: "mm",
  cm: "cm",
  in: "in",
};

export const UNIT_NAME: Record<Unit, string> = {
  mm: "millimeters",
  cm: "centimeters",
  in: "inches",
};

export const MM_PER: Record<Unit, number> = {
  mm: 1,
  cm: 10,
  in: 25.4,
};

export const NUM_RE = String.raw`\d+\s*[-\s]\s*\d+\s*/\s*\d+|\d+\s*/\s*\d+|\d+(?:\.\d+)?`;
export const UNIT_RE = String.raw`millimet(?:er|re)s?|centimet(?:er|re)s?|inches|inch|mm|cm|in|[""″]`;

export function parseNumeric(raw: string): number | null {
  const s = raw.trim().replace(/,/g, "");
  const mixed = s.match(/^(\d+)\s*[-\s]\s*(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const den = Number(mixed[3]);
    if (!den) return null;
    return Number(mixed[1]) + Number(mixed[2]) / den;
  }
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) {
    const den = Number(frac[2]);
    if (!den) return null;
    return Number(frac[1]) / den;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseUnitToken(raw: string | undefined | null): Unit | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s === "mm" || s.startsWith("millimet")) return "mm";
  if (s === "cm" || s.startsWith("centimet")) return "cm";
  if (s === "in" || s.startsWith("inch") || s === '"' || s === "”" || s === "″") return "in";
  return null;
}

export function toMm(value: number, unit: Unit): number {
  return value * MM_PER[unit];
}

export function toDisplay(mm: number, unit: Unit): number {
  return mm / MM_PER[unit];
}

export function decimals(unit: Unit): number {
  return unit === "in" ? 3 : 2;
}

export function stepOf(unit: Unit): number {
  return unit === "in" ? 0.01 : unit === "cm" ? 0.05 : 0.1;
}

export function roundMm(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Convert a typed display value back to mm without rounding-loop drift. */
export function fromDisplay(value: number, unit: Unit, currentMm: number): number {
  const shown = Number(toDisplay(currentMm, unit).toFixed(decimals(unit)));
  if (value === shown) return currentMm;
  return roundMm(toMm(value, unit));
}

export function inferUnit(text: string, fallback: Unit = "mm"): Unit {
  const low = text.toLowerCase();
  const hasIn = /in(?:ch(?:es)?)?\b|[""″]/.test(low);
  const hasMm = /\bmm\b|millimet/.test(low);
  const hasCm = /\bcm\b|centimet/.test(low);
  if (hasIn && !hasMm && !hasCm) return "in";
  if (hasCm && !hasMm && !hasIn) return "cm";
  if (hasMm && !hasIn && !hasCm) return "mm";
  return fallback;
}

export function lengthToMm(numStr: string, unitStr: string | undefined, fallback: Unit): number | null {
  const n = parseNumeric(numStr);
  if (n == null) return null;
  const u = parseUnitToken(unitStr) ?? (numStr.includes("/") ? "in" : fallback);
  return roundMm(toMm(n, u));
}

export function trimNum(n: number, digits: number): string {
  const s = n.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
  return s === "-0" ? "0" : s;
}

export function fmtLen(mm: number, unit: Unit): string {
  return `${trimNum(toDisplay(mm, unit), decimals(unit))} ${UNIT_LABEL[unit]}`;
}

export function fmtNum(mm: number, unit: Unit): string {
  return trimNum(toDisplay(mm, unit), decimals(unit));
}

export function fmtDims(w: number, h: number, t: number, unit: Unit): string {
  return `${fmtNum(w, unit)} × ${fmtNum(h, unit)} × ${fmtNum(t, unit)} ${UNIT_LABEL[unit]}`;
}

export function askPlaceholder(unit: Unit): string {
  if (unit === "in") return 'Ask: 4x3 plate 1/4" thick with 4 holes';
  if (unit === "cm") return "Ask: 8x6 plate 0.6 cm thick with 4 M6 holes";
  return "Ask: 80x60 plate 6mm thick with 4 M6 holes";
}

export function unitHint(unit: Unit): string {
  const working =
    unit === "in" ? "inches" : unit === "cm" ? "centimeters" : "millimeters (also accept inches and cm)";
  return `(User is working in ${working}. Convert every dimension to millimeters in the JSON. 1 in = 25.4 mm, 1 cm = 10 mm.)`;
}

export type AskLengths = {
  width: number | null;
  height: number | null;
  thickness: number | null;
  holeDiameter: number | null;
  pattern: [number, number] | null;
};

export function parseAskLengths(text: string, displayUnit: Unit = "mm"): AskLengths {
  const low = text.toLowerCase();
  const fallback = inferUnit(low, displayUnit);
  const out: AskLengths = {
    width: null,
    height: null,
    thickness: null,
    holeDiameter: null,
    pattern: null,
  };

  const pair = new RegExp(
    `(${NUM_RE})\\s*(${UNIT_RE})?\\s*(?:x|by|×)\\s*(${NUM_RE})\\s*(${UNIT_RE})?`,
    "i",
  );
  const pat = low.match(new RegExp(`${pair.source}\\s*(?:pattern|spacing|centers|bcd)`, "i"));
  if (pat) {
    const px = lengthToMm(pat[1], pat[2], fallback);
    const py = lengthToMm(pat[3], pat[4] || pat[2], fallback);
    if (px != null && py != null) out.pattern = [px, py];
  }

  const size = low.match(pair);
  if (
    size &&
    !/(?:pattern|spacing|centers|bcd)/.test(
      low.slice(size.index ?? 0, (size.index ?? 0) + size[0].length + 16),
    )
  ) {
    const w = lengthToMm(size[1], size[2], fallback);
    const h = lengthToMm(size[3], size[4] || size[2], fallback);
    if (w != null) out.width = w;
    if (h != null) out.height = h;
  }

  const dm = low.match(
    new RegExp(`(?:holes?|bore|id)\\s*(?:are|is|=)\\s*(${NUM_RE})\\s*(${UNIT_RE})?`, "i"),
  );
  const dm2 = low.match(new RegExp(`(${NUM_RE})\\s*(${UNIT_RE})\\s*(?:holes?|clearance)`, "i"));
  const dm3 = low.match(new RegExp(`holes?\\s+(${NUM_RE})\\s*(${UNIT_RE})`, "i"));
  if (dm) out.holeDiameter = lengthToMm(dm[1], dm[2], fallback);
  else if (dm2) out.holeDiameter = lengthToMm(dm2[1], dm2[2], fallback);
  else if (dm3) out.holeDiameter = lengthToMm(dm3[1], dm3[2], fallback);

  const tm = low.match(new RegExp(`(${NUM_RE})\\s*(${UNIT_RE})?\\s*thick`, "i"));
  const tm2 = low.match(new RegExp(`thick(?:ness)?\\s*(?:is|=)?\\s*(${NUM_RE})\\s*(${UNIT_RE})?`, "i"));
  if (tm) out.thickness = lengthToMm(tm[1], tm[2], fallback);
  else if (tm2) out.thickness = lengthToMm(tm2[1], tm2[2], fallback);

  return out;
}
