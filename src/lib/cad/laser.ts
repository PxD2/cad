import { sitOffsetY, wrapAngle, type Inst } from "./assembly.ts";
import type { Hole, Part } from "./types.ts";

export const LASER_TOL = 0.45;

export type HoleHit = {
  instId: string;
  i: number;
  x: number;
  y: number;
  z: number;
  d: number;
};

export type LaserLock = {
  axis: "x" | "y" | "z";
  value: number;
  a: HoleHit;
  b: HoleHit;
};

export type Vec3 = { x: number; y: number; z: number };

/** Mounting / bore holes a laser can fire through. */
export function holesOf(part: Part): Hole[] {
  const listed = part.holes.filter((h) => h.d > 0.2 && Number.isFinite(h.x) && Number.isFinite(h.y));
  if (part.solid?.kind === "nema" && listed.length <= 1) return nemaHoles(part.solid.size ?? 17);
  if (listed.length) return listed;
  if (part.solid?.bore) return [{ x: 0, y: 0, d: part.solid.bore }];
  if (part.solid?.hole) return [{ x: 0, y: 0, d: part.solid.hole }];
  if (part.solid?.id) return [{ x: 0, y: 0, d: part.solid.id }];
  return [];
}

function nemaHoles(size: number): Hole[] {
  const pattern = size === 8 ? 16 : size === 11 ? 23 : size === 14 ? 26 : size === 23 ? 47.14 : 31;
  const bore = size === 8 ? 16 : size === 23 ? 38.1 : 22;
  const p = pattern / 2;
  return [
    { x: 0, y: 0, d: bore },
    { x: -p, y: -p, d: 3.4 },
    { x: p, y: -p, d: 3.4 },
    { x: p, y: p, d: 3.4 },
    { x: -p, y: p, d: 3.4 },
  ];
}

/**
 * Hole center in mesh-local space. Plate geos bake rotateX(-90) + translate(0, t/2),
 * so a 2D hole (hx, hy) lands at (hx, t, -hy) — mid-thickness of the extruded solid.
 */
export function holeLocal(part: Part, hole: Hole): Vec3 {
  return { x: hole.x, y: part.thick, z: -hole.y };
}

/** Same Euler XYZ as the viewport wrap: flip about X, then yaw about Y, then sit + inst origin. */
export function holeWorld(it: Inst, hole: Hole): Vec3 {
  const loc = holeLocal(it.part, hole);
  const flip = (wrapAngle(it.flip ?? 0) * Math.PI) / 180;
  const rot = (wrapAngle(it.rot) * Math.PI) / 180;
  const cF = Math.cos(flip);
  const sF = Math.sin(flip);
  const y1 = loc.y * cF - loc.z * sF;
  const z1 = loc.y * sF + loc.z * cF;
  const cR = Math.cos(rot);
  const sR = Math.sin(rot);
  const x2 = loc.x * cR + z1 * sR;
  const z2 = -loc.x * sR + z1 * cR;
  return {
    x: x2 + it.x,
    y: y1 + it.y + sitOffsetY(it.part, it.flip ?? 0),
    z: z2 + it.z,
  };
}

export function holeHits(list: Inst[]): HoleHit[] {
  const out: HoleHit[] = [];
  for (const it of list) {
    if (!it.visible) continue;
    holesOf(it.part).forEach((h, i) => {
      const w = holeWorld(it, h);
      out.push({ instId: it.id, i, x: w.x, y: w.y, z: w.z, d: h.d });
    });
  }
  return out;
}

export function brushInst(part: Part): Inst {
  return {
    id: "brush",
    name: part.name,
    part,
    x: 0,
    y: 0,
    z: 0,
    rot: 0,
    flip: 0,
    visible: true,
  };
}

export function laserLocks(hits: HoleHit[], tol = LASER_TOL): LaserLock[] {
  const out: LaserLock[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < hits.length; i++) {
    for (let j = i + 1; j < hits.length; j++) {
      const a = hits[i];
      const b = hits[j];
      if (a.instId === b.instId) continue;
      const axes: Array<["x" | "y" | "z", number, number]> = [
        ["x", a.x, b.x],
        ["y", a.y, b.y],
        ["z", a.z, b.z],
      ];
      for (const [axis, va, vb] of axes) {
        if (Math.abs(va - vb) > tol) continue;
        const value = (va + vb) / 2;
        const key = `${axis}:${a.instId}:${a.i}:${b.instId}:${b.i}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ axis, value, a, b });
      }
    }
  }
  return out;
}

export function lockAxes(locks: LaserLock[], selId?: string | null): Array<"x" | "y" | "z"> {
  const axes = new Set<"x" | "y" | "z">();
  for (const l of locks) {
    if (selId && l.a.instId !== selId && l.b.instId !== selId && selId !== "brush") continue;
    axes.add(l.axis);
  }
  return (["x", "y", "z"] as const).filter((a) => axes.has(a));
}

function magnetShift(mine: Vec3[], theirs: Vec3[], axis: "x" | "y" | "z", reach: number): number {
  let best = 0;
  let dist = reach;
  for (const m of mine) {
    for (const t of theirs) {
      const d = t[axis] - m[axis];
      const ad = Math.abs(d);
      if (ad < dist) {
        dist = ad;
        best = d;
      }
    }
  }
  return dist < reach ? best : 0;
}

/** Pull a dragged solid so one of its holes rides another part's X/Z laser. */
export function snapToLasers(moving: Inst, others: Inst[], x: number, z: number, snap: number): { x: number; z: number } {
  const trial: Inst = { ...moving, x, z };
  const mine = holesOf(trial.part).map((h) => holeWorld(trial, h));
  const theirs = holeHits(others);
  if (!mine.length || !theirs.length) return { x, z };
  const reach = Math.max(2.6, (snap > 0 ? snap : 1) * 0.7);
  const pts = theirs.map((h) => ({ x: h.x, y: h.y, z: h.z }));
  return {
    x: x + magnetShift(mine, pts, "x", reach),
    z: z + magnetShift(mine, pts, "z", reach),
  };
}

/** Wheel-lift magnet: hole plumb lines snap onto another hole's Y. */
export function snapLiftToLasers(moving: Inst, others: Inst[], y: number, snap: number): number {
  const trial: Inst = { ...moving, y };
  const mine = holesOf(trial.part).map((h) => holeWorld(trial, h));
  const theirs = holeHits(others);
  if (!mine.length || !theirs.length) return y;
  const reach = Math.max(2.6, (snap > 0 ? snap : 1) * 0.7);
  const pts = theirs.map((h) => ({ x: h.x, y: h.y, z: h.z }));
  return y + magnetShift(mine, pts, "y", reach);
}

/**
 * Shop move: slide the selected solid so as many holes as possible sit on
 * another part's lasers. X and Z are independent, like squaring to a laser level.
 */
export function alignToLasers(moving: Inst, others: Inst[]): { x: number; z: number } {
  const mine0 = holesOf(moving.part).map((h) => holeWorld(moving, h));
  const theirs = holeHits(others).map((h) => ({ x: h.x, y: h.y, z: h.z }));
  if (!mine0.length || !theirs.length) return { x: moving.x, z: moving.z };
  const dx = bestPairShift(mine0, theirs, "x");
  const dz = bestPairShift(mine0, theirs, "z");
  return { x: moving.x + dx, z: moving.z + dz };
}

function bestPairShift(mine: Vec3[], theirs: Vec3[], axis: "x" | "z"): number {
  let best = 0;
  let score = -1;
  let mag = Infinity;
  for (const m of mine) {
    for (const t of theirs) {
      const d = t[axis] - m[axis];
      let s = 0;
      for (const m2 of mine) {
        for (const t2 of theirs) {
          if (Math.abs(m2[axis] + d - t2[axis]) <= LASER_TOL) s += 1;
        }
      }
      const ad = Math.abs(d);
      if (s > score || (s === score && ad < mag)) {
        score = s;
        mag = ad;
        best = d;
      }
    }
  }
  return score > 0 ? best : 0;
}

export function laserCaption(layers: Inst[], selId: string | null): string {
  const hits = holeHits(layers);
  if (!hits.length) return "";
  const axes = lockAxes(laserLocks(hits), selId);
  const n = selId && selId !== "brush" ? hits.filter((h) => h.instId === selId).length : hits.length;
  const shown = n || hits.length;
  const lock = axes.length ? ` · LOCK ${axes.map((a) => a.toUpperCase()).join(" ")}` : "";
  return `Laser ${shown} hole${shown === 1 ? "" : "s"}${lock}`;
}
