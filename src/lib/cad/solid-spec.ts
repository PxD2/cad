export type SolidKind =
  | "plate"
  | "spur"
  | "herringbone"
  | "rack"
  | "pulley"
  | "bearing"
  | "coupling"
  | "bracket"
  | "standoff"
  | "knob"
  | "nema"
  | "compound"
  | "bevel"
  | "worm"
  | "washer"
  | "nut"
  | "bushing"
  | "hinge"
  | "tslot"
  | "flange"
  | "bolt"
  | "cube"
  | "box"
  | "hook"
  | "clip"
  | "stand"
  | "opener"
  | "disk"
  | "card"
  | "bin"
  | "grid"
  | "grill"
  | "wrench"
  | "comb"
  | "hull"
  | "spinner"
  | "ruler"
  | "case"
  | "xyzcube"
  | "collar"
  | "flexcoup"
  | "idler"
  | "beltclip"
  | "gopro"
  | "picam"
  | "arm"
  | "nameplate"
  | "mushroom"
  | "headhook"
  | "spool"
  | "snapbox"
  | "ledclip"
  | "belt"
  | "shaft"
  | "leadscrew"
  | "sprocket"
  | "spring"
  | "rail"
  | "wheel"
  | "pipe"
  | "servo"
  | "helical"
  | "internal"
  | "insert"
  | "corner"
  | "fan"
  | "chain"
  | "battery"
  | "arduino"
  | "planetary"
  | "motor";

export const SOLID_KINDS: SolidKind[] = [
  "plate",
  "spur",
  "herringbone",
  "rack",
  "pulley",
  "bearing",
  "coupling",
  "bracket",
  "standoff",
  "knob",
  "nema",
  "compound",
  "bevel",
  "worm",
  "washer",
  "nut",
  "bushing",
  "hinge",
  "tslot",
  "flange",
  "bolt",
  "cube",
  "box",
  "hook",
  "clip",
  "stand",
  "opener",
  "disk",
  "card",
  "bin",
  "grid",
  "grill",
  "wrench",
  "comb",
  "hull",
  "spinner",
  "ruler",
  "case",
  "xyzcube",
  "collar",
  "flexcoup",
  "idler",
  "beltclip",
  "gopro",
  "picam",
  "arm",
  "nameplate",
  "mushroom",
  "headhook",
  "spool",
  "snapbox",
  "ledclip",
  "belt",
  "shaft",
  "leadscrew",
  "sprocket",
  "spring",
  "rail",
  "wheel",
  "pipe",
  "servo",
  "helical",
  "internal",
  "insert",
  "corner",
  "fan",
  "chain",
  "battery",
  "arduino",
  "planetary",
  "motor",
];

export type SolidSpec = {
  kind: SolidKind;
  teeth?: number;
  teeth2?: number;
  module?: number;
  bore?: number;
  pitch?: number;
  od?: number;
  id?: number;
  width?: number;
  length?: number;
  height?: number;
  flutes?: number;
  hole?: number;
  a?: number;
  b?: number;
  t?: number;
  size?: number;
};

export function envelopeOf(s: SolidSpec): { width: number; height: number; thick: number } {
  if (s.kind === "spur" || s.kind === "herringbone" || s.kind === "bevel" || s.kind === "helical") {
    const z = s.teeth ?? 20;
    const m = s.module ?? 2;
    const d = (z + 2) * m;
    return { width: d, height: d, thick: s.t ?? 8 };
  }
  if (s.kind === "compound" || s.kind === "planetary") {
    const m = s.module ?? 2;
    const z = Math.max(s.teeth ?? 20, s.teeth2 ?? 40);
    const d = (z + 2) * m;
    return { width: d, height: d, thick: s.t ?? (s.kind === "planetary" ? 10 : 16) };
  }
  if (s.kind === "internal") {
    const z = s.teeth ?? 40;
    const m = s.module ?? 2;
    const d = (z + 4) * m;
    return { width: d, height: d, thick: s.t ?? 8 };
  }
  if (s.kind === "worm") {
    const m = s.module ?? 2;
    const z = s.teeth ?? 2;
    const d = (z + 2) * m + 8;
    return { width: d, height: d, thick: s.length ?? 24 };
  }
  if (s.kind === "rack") {
    const z = s.teeth ?? 16;
    const m = s.module ?? 2;
    return { width: z * Math.PI * m + 8, height: 2.5 * m + (s.t ?? 8), thick: s.t ?? 8 };
  }
  if (s.kind === "pulley" || s.kind === "idler" || s.kind === "sprocket") {
    const z = s.teeth ?? 20;
    const p = s.pitch ?? (s.kind === "sprocket" ? 12.7 : 2);
    const d = (z * p) / Math.PI + (s.kind === "sprocket" ? 12 : 8);
    return { width: d, height: d, thick: s.t ?? (s.kind === "sprocket" ? 8 : 8) };
  }
  if (s.kind === "belt") {
    if ((s.teeth ?? 0) <= 0 || (s.pitch ?? 0) <= 0) {
      const d = s.od ?? 80;
      return { width: d, height: d, thick: s.t ?? 13 };
    }
    const z = s.teeth ?? 100;
    const p = s.pitch ?? 2;
    const d = (z * p) / Math.PI + 6;
    return { width: d, height: d, thick: s.t ?? 6 };
  }
  if (s.kind === "bearing" || s.kind === "washer" || s.kind === "disk" || s.kind === "grill") {
    const od = s.od ?? (s.kind === "grill" ? 40 : s.kind === "disk" ? 90 : 22);
    return { width: od, height: od, thick: s.width ?? s.t ?? (s.kind === "washer" ? 2 : s.kind === "disk" ? 4 : 7) };
  }
  if (s.kind === "coupling" || s.kind === "bushing" || s.kind === "flexcoup") {
    const od = s.od ?? (s.kind === "flexcoup" ? 20 : 18);
    const len = s.length ?? s.height ?? 25;
    return { width: od + (s.kind === "bushing" ? 8 : 0), height: od + (s.kind === "bushing" ? 8 : 0), thick: len };
  }
  if (s.kind === "bracket" || s.kind === "hinge") {
    const a = s.a ?? 40;
    const b = s.b ?? 40;
    return { width: a, height: b, thick: s.t ?? 4 };
  }
  if (s.kind === "standoff" || s.kind === "nut" || s.kind === "bolt" || s.kind === "spinner" || s.kind === "insert") {
    const od = s.od ?? (s.kind === "spinner" ? 18 : s.kind === "insert" ? 5 : 8);
    return { width: od, height: od, thick: s.height ?? (s.kind === "nut" ? 4 : s.kind === "spinner" ? 28 : s.kind === "insert" ? 6 : 12) };
  }
  if (s.kind === "knob" || s.kind === "mushroom") {
    const od = s.od ?? (s.kind === "mushroom" ? 28 : 32);
    return { width: od, height: od, thick: s.height ?? (s.kind === "mushroom" ? 18 : 14) };
  }
  if (s.kind === "nema") {
    const n = s.size ?? 17;
    const w =
      n === 8 ? 20.4 : n === 11 ? 28.2 : n === 14 ? 35.2 : n === 23 ? 56.4 : n === 24 ? 60 : n === 34 ? 86 : n === 42 ? 110 : 42.3;
    return { width: w, height: w, thick: s.t ?? 5 };
  }
  if (s.kind === "motor") {
    const style = s.size ?? 1;
    const od = s.od ?? 28;
    const shaft = s.t ?? (style === 6 ? 0 : 12);
    const can = s.length ?? 20;
    if (style === 6) return { width: od, height: od, thick: Math.max(can, 28) };
    if (style === 7) {
      const w = od;
      return { width: w, height: w, thick: can + shaft };
    }
    if (style === 5) {
      const footL = s.b ?? 102;
      const footW = s.a ?? 56;
      return { width: Math.max(od, footL), height: od + footW + 8, thick: can + shaft };
    }
    if (style === 4) {
      return { width: Math.max(od, s.a ?? 12), height: Math.max(od, s.b ?? 10), thick: can + shaft };
    }
    return { width: od, height: od, thick: can + shaft };
  }
  if (s.kind === "tslot") {
    const a = s.a ?? 20;
    return { width: a, height: a, thick: s.length ?? 40 };
  }
  if (s.kind === "flange" || s.kind === "collar") {
    const od = s.od ?? (s.kind === "collar" ? 22 : 50);
    return { width: od, height: od, thick: s.t ?? (s.kind === "collar" ? 8 : 6) };
  }
  if (s.kind === "cube" || s.kind === "xyzcube") {
    const a = s.a ?? 20;
    return { width: a, height: a, thick: a };
  }
  if (s.kind === "box" || s.kind === "case" || s.kind === "bin" || s.kind === "snapbox") {
    const w = s.width ?? (s.kind === "bin" ? 42 : s.kind === "case" ? 90 : 80);
    const h = s.height ?? (s.kind === "bin" ? 42 : s.kind === "case" ? 60 : 60);
    const t = s.t ?? (s.kind === "bin" ? 21 : s.kind === "snapbox" ? 28 : 25);
    return { width: w, height: h, thick: t };
  }
  if (s.kind === "grid") {
    const n = s.size ?? 2;
    return { width: n * 42, height: n * 42, thick: 5 };
  }
  if (s.kind === "hook") return { width: s.a ?? 18, height: s.b ?? 40, thick: s.t ?? 12 };
  if (s.kind === "headhook") return { width: s.a ?? 36, height: s.b ?? 52, thick: s.t ?? 14 };
  if (s.kind === "clip") return { width: s.a ?? 16, height: s.b ?? 18, thick: s.t ?? 12 };
  if (s.kind === "beltclip") return { width: s.a ?? 28, height: s.b ?? 18, thick: s.t ?? 12 };
  if (s.kind === "ledclip") return { width: s.a ?? 12, height: s.b ?? 10, thick: s.t ?? 8 };
  if (s.kind === "stand") return { width: s.width ?? 70, height: s.height ?? 80, thick: s.t ?? 12 };
  if (s.kind === "opener") return { width: s.length ?? 80, height: 18, thick: 8 };
  if (s.kind === "card") return { width: 85.6, height: 54, thick: s.t ?? 0.8 };
  if (s.kind === "wrench") return { width: s.length ?? 90, height: 18, thick: 6 };
  if (s.kind === "comb") return { width: s.length ?? 40, height: 12, thick: 8 };
  if (s.kind === "hull") return { width: 60, height: 31, thick: 48 };
  if (s.kind === "ruler") return { width: s.length ?? 100, height: 20, thick: 3 };
  if (s.kind === "gopro") return { width: s.a ?? 32, height: s.b ?? 24, thick: s.t ?? 18 };
  if (s.kind === "picam") return { width: 25, height: 24, thick: s.t ?? 3 };
  if (s.kind === "arm") return { width: s.a ?? 50, height: s.b ?? 24, thick: s.t ?? 16 };
  if (s.kind === "nameplate") return { width: s.width ?? 80, height: s.height ?? 30, thick: s.t ?? 8 };
  if (s.kind === "spool") return { width: s.width ?? 80, height: s.height ?? 70, thick: s.t ?? 16 };
  if (s.kind === "shaft" || s.kind === "leadscrew" || s.kind === "pipe") {
    const od = s.od ?? (s.kind === "pipe" ? 21.3 : s.kind === "leadscrew" ? 8 : 8);
    const len = s.length ?? 80;
    return { width: od, height: od, thick: len };
  }
  if (s.kind === "spring") {
    const od = s.od ?? 12;
    return { width: od, height: od, thick: s.length ?? 30 };
  }
  if (s.kind === "rail") {
    const w = s.a ?? 12;
    return { width: w, height: w + 4, thick: s.length ?? 100 };
  }
  if (s.kind === "wheel") {
    const od = s.od ?? 80;
    return { width: od, height: od, thick: s.t ?? 12 };
  }
  if (s.kind === "servo") {
    const w = s.width ?? 23;
    return { width: w, height: s.height ?? 12.5, thick: s.t ?? 22 };
  }
  if (s.kind === "corner") {
    const a = s.a ?? 20;
    return { width: a, height: a, thick: a };
  }
  if (s.kind === "fan") {
    const od = s.od ?? 40;
    return { width: od, height: od, thick: s.t ?? 10 };
  }
  if (s.kind === "chain") {
    return { width: s.length ?? 50, height: 12, thick: 8 };
  }
  if (s.kind === "battery") {
    return { width: s.width ?? 40, height: s.height ?? 22, thick: s.t ?? 20 };
  }
  if (s.kind === "arduino") {
    return { width: s.width ?? 68.6, height: s.height ?? 53.4, thick: s.t ?? 4 };
  }
  if (s.kind === "plate") return { width: s.width ?? 80, height: s.height ?? 60, thick: s.t ?? 6 };
  return { width: s.width ?? 80, height: s.height ?? 60, thick: s.t ?? 6 };
}

export function parseBeniPragma(src: string): SolidSpec | null {
  const m = src.match(/\/\/\s*(?:pxd2|beni):(\w+)([^\n]*)/);
  if (!m) return null;
  const kind = m[1] as SolidKind;
  const kv: Record<string, number> = {};
  for (const p of m[2].trim().split(/\s+/).filter(Boolean)) {
    const [k, v] = p.split("=");
    if (k && v && Number.isFinite(Number(v))) kv[k] = Number(v);
  }
  if (!SOLID_KINDS.includes(kind)) return null;
  return { kind, ...kv };
}

export function isGearKind(k: SolidKind | undefined) {
  return (
    k === "spur" ||
    k === "herringbone" ||
    k === "compound" ||
    k === "bevel" ||
    k === "rack" ||
    k === "pulley" ||
    k === "idler" ||
    k === "helical" ||
    k === "internal" ||
    k === "sprocket"
  );
}

export function scadPragma(solid: SolidSpec) {
  return `// pxd2:${solid.kind} ${Object.entries(solid)
    .filter(([k]) => k !== "kind")
    .map(([k, v]) => `${k}=${v}`)
    .join(" ")}`;
}
