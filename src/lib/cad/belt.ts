import type { Inst } from "./assembly.ts";
import { newInstId } from "./assembly.ts";
import type { Part } from "./types.ts";

export type BeltProfileId = "gt2" | "gt3" | "htd3" | "htd5" | "t5" | "t2p5" | "mxl" | "va";

export type BeltProfile = {
  id: BeltProfileId;
  name: string;
  pitch: number;
  width: number;
  thick: number;
};

export const BELT_PROFILES: Record<BeltProfileId, BeltProfile> = {
  gt2: { id: "gt2", name: "GT2", pitch: 2, width: 6, thick: 1.38 },
  gt3: { id: "gt3", name: "GT3", pitch: 3, width: 9, thick: 2.2 },
  htd3: { id: "htd3", name: "HTD 3M", pitch: 3, width: 9, thick: 2.4 },
  htd5: { id: "htd5", name: "HTD 5M", pitch: 5, width: 15, thick: 3.6 },
  t5: { id: "t5", name: "T5", pitch: 5, width: 10, thick: 2.2 },
  t2p5: { id: "t2p5", name: "T2.5", pitch: 2.5, width: 6, thick: 1.3 },
  mxl: { id: "mxl", name: "MXL", pitch: 2.032, width: 6.35, thick: 1.2 },
  va: { id: "va", name: "V-belt A", pitch: 0, width: 13, thick: 8 },
};

export const BELT_PROFILE_LIST: BeltProfileId[] = ["gt2", "gt3", "htd3", "htd5", "t5", "t2p5", "mxl", "va"];

export type BeltLoop = {
  id: string;
  profile: BeltProfileId;
  width: number;
  pulleyIds: string[];
  crossed: boolean;
};

export type BeltPt = { x: number; y: number; z: number };

export type BeltCircle = { x: number; y: number; z: number; r: number };

export type BeltPath = {
  points: BeltPt[];
  length: number;
  teeth: number;
  pitch: number;
  width: number;
  thick: number;
  profile: BeltProfile;
  ok: boolean;
  note: string;
};

const PULLEY_KINDS = new Set([
  "pulley",
  "idler",
  "spur",
  "herringbone",
  "helical",
  "sprocket",
  "wheel",
  "bearing",
  "compound",
  "bevel",
]);

export function isPulleyLike(part: Part | undefined | null): boolean {
  return !!part?.solid && PULLEY_KINDS.has(part.solid.kind);
}

export function pitchRadius(part: Part): number {
  const s = part.solid;
  if (!s) return Math.max(4, Math.min(part.width, part.height) / 2 - 2);
  if (s.kind === "pulley" || s.kind === "idler") {
    return ((s.teeth ?? 20) * (s.pitch ?? 2)) / (2 * Math.PI);
  }
  if (s.kind === "sprocket") {
    return ((s.teeth ?? 15) * (s.pitch ?? 12.7)) / (2 * Math.PI);
  }
  if (s.kind === "spur" || s.kind === "herringbone" || s.kind === "helical" || s.kind === "bevel" || s.kind === "compound") {
    return ((s.teeth ?? 20) * (s.module ?? 2)) / 2;
  }
  if (s.kind === "bearing" || s.kind === "wheel") return (s.od ?? part.width) / 2;
  return Math.max(4, Math.min(part.width, part.height) / 2 - 2);
}

export function circleOf(it: Inst): BeltCircle {
  const t = Math.max(1, it.part.thick || 8);
  return { x: it.x, y: it.y + t / 2, z: it.z, r: Math.max(2, pitchRadius(it.part)) };
}

export function openBeltLength(c: number, r1: number, r2: number): number {
  const dr = r1 - r2;
  return 2 * c + Math.PI * (r1 + r2) + (dr * dr) / Math.max(c, 0.01);
}

export function snapTeeth(length: number, pitch: number): number {
  if (pitch <= 0) return 0;
  return Math.max(16, Math.round(length / pitch));
}

export function makeBelt(pulleyIds: string[], profile: BeltProfileId = "gt2", width?: number, crossed = false): BeltLoop {
  const p = BELT_PROFILES[profile];
  return {
    id: `b${newInstId().slice(1)}`,
    profile,
    width: width ?? p.width,
    pulleyIds: [...pulleyIds],
    crossed,
  };
}

export function inferProfile(parts: Part[]): BeltProfileId {
  const pitches = parts.map((p) => p.solid?.pitch ?? 0).filter((n) => n > 0);
  if (pitches.some((n) => Math.abs(n - 5) < 0.05)) return "htd5";
  if (pitches.some((n) => Math.abs(n - 3) < 0.05)) return "gt3";
  if (pitches.some((n) => Math.abs(n - 2.5) < 0.05)) return "t2p5";
  if (pitches.some((n) => Math.abs(n - 2.032) < 0.01)) return "mxl";
  if (pitches.some((n) => Math.abs(n - 2) < 0.05)) return "gt2";
  return "gt2";
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function arc(cx: number, cz: number, r: number, y: number, from: number, to: number, ccw: boolean, step = 0.2): BeltPt[] {
  let a0 = from;
  let a1 = to;
  if (ccw) {
    while (a1 <= a0 + 1e-6) a1 += Math.PI * 2;
  } else {
    while (a1 >= a0 - 1e-6) a1 -= Math.PI * 2;
  }
  const sweep = a1 - a0;
  const n = Math.max(8, Math.ceil(Math.abs(sweep) / step));
  const pts: BeltPt[] = [];
  for (let i = 0; i <= n; i++) {
    const ang = a0 + (sweep * i) / n;
    pts.push({ x: cx + r * Math.cos(ang), y, z: cz + r * Math.sin(ang) });
  }
  return pts;
}

export function twoPulleyPath(a: BeltCircle, b: BeltCircle, crossed = false): BeltPt[] {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const c = Math.hypot(dx, dz);
  if (c < 1e-3) return [];
  const theta = Math.atan2(dz, dx);
  const y = (a.y + b.y) / 2;
  if (crossed) {
    const phi = Math.acos(clamp((a.r + b.r) / c, -1, 1));
    const leftA = theta + phi;
    const rightA = theta - phi;
    const leftB = theta + phi + Math.PI;
    const rightB = theta - phi + Math.PI;
    return [...arc(a.x, a.z, a.r, y, leftA, rightA, true), ...arc(b.x, b.z, b.r, y, rightB, leftB, true)];
  }
  const phi = Math.acos(clamp((a.r - b.r) / c, -1, 1));
  const leftA = theta + phi;
  const leftB = theta + phi;
  const rightA = theta - phi;
  const rightB = theta - phi;
  return [...arc(a.x, a.z, a.r, y, leftA, rightA, true), ...arc(b.x, b.z, b.r, y, rightB, leftB, false)];
}

function polyLen(pts: BeltPt[]): number {
  if (pts.length < 2) return 0;
  let L = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    L += Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
  }
  return L;
}

function outerTangent(a: BeltCircle, b: BeltCircle, cx: number, cz: number) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const c = Math.max(1e-3, Math.hypot(dx, dz));
  const theta = Math.atan2(dz, dx);
  const phi = Math.acos(clamp((a.r - b.r) / c, -1, 1));
  const y = (a.y + b.y) / 2;
  let bestD = -1;
  let best = {
    angA: theta + phi,
    angB: theta + phi,
    pA: { x: a.x, y, z: a.z } as BeltPt,
    pB: { x: b.x, y, z: b.z } as BeltPt,
  };
  for (const s of [1, -1] as const) {
    const angA = theta + s * phi;
    const angB = theta + s * phi;
    const pA: BeltPt = { x: a.x + a.r * Math.cos(angA), y, z: a.z + a.r * Math.sin(angA) };
    const pB: BeltPt = { x: b.x + b.r * Math.cos(angB), y, z: b.z + b.r * Math.sin(angB) };
    const d = Math.hypot((pA.x + pB.x) / 2 - cx, (pA.z + pB.z) / 2 - cz);
    if (d > bestD) {
      bestD = d;
      best = { angA, angB, pA, pB };
    }
  }
  return best;
}

function wrapMany(circles: BeltCircle[]): { points: BeltPt[]; length: number; ok: boolean; note: string } {
  const cx = circles.reduce((s, p) => s + p.x, 0) / circles.length;
  const cz = circles.reduce((s, p) => s + p.z, 0) / circles.length;
  const ordered = circles.slice().sort((a, b) => Math.atan2(a.z - cz, a.x - cx) - Math.atan2(b.z - cz, b.x - cx));
  const n = ordered.length;
  const incoming: number[] = new Array(n);
  const outgoing: number[] = new Array(n);
  const land: BeltPt[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = ordered[i];
    const b = ordered[(i + 1) % n];
    const hit = outerTangent(a, b, cx, cz);
    outgoing[i] = hit.angA;
    incoming[(i + 1) % n] = hit.angB;
    land[(i + 1) % n] = hit.pB;
  }
  const points: BeltPt[] = [];
  for (let i = 0; i < n; i++) {
    const a = ordered[i];
    points.push(...arc(a.x, a.z, a.r, a.y, incoming[i], outgoing[i], true));
    const next = land[(i + 1) % n];
    if (next) points.push(next);
  }
  const length = polyLen(points);
  return { points, length, ok: points.length > 12, note: "" };
}

export function wrapCircles(circles: BeltCircle[], crossed = false): { points: BeltPt[]; length: number; ok: boolean; note: string } {
  if (circles.length < 2) return { points: [], length: 0, ok: false, note: "Click two pulleys" };
  if (circles.length === 2) {
    const [a, b] = circles;
    const c = Math.hypot(b.x - a.x, b.z - a.z);
    const min = a.r + b.r + 0.8;
    if (c < min) return { points: [], length: 0, ok: false, note: "Pulleys overlap — spread them" };
    const points = twoPulleyPath(a, b, crossed);
    const length = crossed ? polyLen(points) : openBeltLength(c, a.r, b.r);
    return { points, length, ok: points.length > 8, note: "" };
  }
  return wrapMany(circles);
}

export function wrapBelt(instances: Inst[], belt: BeltLoop): BeltPath {
  const profile = BELT_PROFILES[belt.profile] ?? BELT_PROFILES.gt2;
  const circles: BeltCircle[] = [];
  for (const id of belt.pulleyIds) {
    const it = instances.find((x) => x.id === id && x.visible);
    if (!it) continue;
    circles.push(circleOf(it));
  }
  const wrapped = wrapCircles(circles, belt.crossed);
  const teeth = snapTeeth(wrapped.length, profile.pitch);
  const length = profile.pitch > 0 ? teeth * profile.pitch : wrapped.length;
  return {
    points: wrapped.points,
    length,
    teeth,
    pitch: profile.pitch,
    width: belt.width || profile.width,
    thick: profile.thick,
    profile,
    ok: wrapped.ok,
    note: wrapped.note,
  };
}

export function beltCaption(path: BeltPath): string {
  if (!path.ok) return path.note || "Belt needs two pulleys";
  if (path.pitch > 0) {
    return `${path.profile.name} · ${path.teeth}T · ${path.length.toFixed(0)} mm · ${path.width} mm`;
  }
  return `${path.profile.name} · ${path.length.toFixed(0)} mm inside · ${path.width} mm`;
}

export function pulleyCandidates(list: Inst[]): Inst[] {
  return list.filter((it) => it.visible && isPulleyLike(it.part));
}

export function nearestPulley(list: Inst[], id: string): Inst | null {
  const self = list.find((x) => x.id === id);
  if (!self) return null;
  let best: Inst | null = null;
  let d = Infinity;
  for (const it of pulleyCandidates(list)) {
    if (it.id === id) continue;
    const dist = Math.hypot(it.x - self.x, it.z - self.z);
    if (dist < d) {
      d = dist;
      best = it;
    }
  }
  return best;
}

export function defaultBeltPair(list: Inst[], a?: string | null, b?: string | null): string[] | null {
  if (a && b && a !== b) return [a, b];
  const pulleys = pulleyCandidates(list);
  if (a) {
    const other = nearestPulley(list, a);
    return other ? [a, other.id] : null;
  }
  if (pulleys.length >= 2) return [pulleys[pulleys.length - 2].id, pulleys[pulleys.length - 1].id];
  return null;
}

export function samePulleySet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort().join(",");
  const sb = [...b].sort().join(",");
  return sa === sb;
}
