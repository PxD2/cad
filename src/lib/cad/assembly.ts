import type { Part } from "./types";

export type PaintTool = "select" | "stamp" | "stack" | "move" | "erase" | "belt";

export type Inst = {
  id: string;
  name: string;
  part: Part;
  x: number;
  y: number;
  z: number;
  rot: number;
  flip: number;
  visible: boolean;
};

export const SNAP_STEPS = [0, 1, 5, 20] as const;
export const LAYER_COLORS = [0xc5cdd4, 0xb7c4b0, 0xc4b8a8, 0xa8b4c4, 0xc0b0b8, 0xb8c0c8];
export const BED_MAX_Y = 350;

export function newInstId() {
  return `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export function clonePart(part: Part): Part {
  return JSON.parse(JSON.stringify(part)) as Part;
}

export function snapTo(n: number, step: number) {
  if (step <= 0) return n;
  return Math.round(n / step) * step;
}

export function wrapAngle(n: number) {
  return ((n % 360) + 360) % 360;
}

export function makeInst(part: Part, x = 0, y = 0, z = 0, rot = 0, flip = 0): Inst {
  return {
    id: newInstId(),
    name: part.name || "layer",
    part: clonePart(part),
    x,
    y,
    z,
    rot,
    flip,
    visible: true,
  };
}

export function restackY(list: Inst[]): Inst[] {
  let y = 0;
  return list.map((it) => {
    const next = { ...it, y };
    y += Math.max(0.4, flippedSize(it.part, it.flip).h);
    return next;
  });
}

export function hitStackY(list: Inst[], x: number, z: number, radius = 18): number {
  let top = 0;
  for (const it of list) {
    if (!it.visible) continue;
    const dx = it.x - x;
    const dz = it.z - z;
    const reach = Math.max(it.part.width, it.part.height) / 2 + radius;
    if (dx * dx + dz * dz <= reach * reach) {
      top = Math.max(top, it.y + flippedSize(it.part, it.flip).h);
    }
  }
  return top;
}

export function raiseIn(list: Inst[], id: string): Inst[] {
  const i = list.findIndex((x) => x.id === id);
  if (i < 0 || i >= list.length - 1) return list;
  const next = list.slice();
  const [row] = next.splice(i, 1);
  next.splice(i + 1, 0, row);
  return restackY(next);
}

export function lowerIn(list: Inst[], id: string): Inst[] {
  const i = list.findIndex((x) => x.id === id);
  if (i <= 0) return list;
  const next = list.slice();
  const [row] = next.splice(i, 1);
  next.splice(i - 1, 0, row);
  return restackY(next);
}

export function nearestInst(list: Inst[], x: number, z: number): string | null {
  let best: string | null = null;
  let d = Infinity;
  for (const it of list) {
    if (!it.visible) continue;
    const dist = Math.hypot(it.x - x, it.z - z);
    const reach = Math.max(it.part.width, it.part.height) / 2 + 12;
    if (dist <= reach && dist < d) {
      d = dist;
      best = it.id;
    }
  }
  return best;
}

export function nextStampXZ(list: Inst[], step: number) {
  if (list.length === 0) return { x: 0, z: 0 };
  return { x: snapTo(list.length * Math.max(step, 20), Math.max(step, 20)), z: 0 };
}

export function bedHeights(list: Inst[], skipId?: string): number[] {
  const beds = [0];
  for (const it of list) {
    if (!it.visible || it.id === skipId) continue;
    beds.push(it.y, it.y + Math.max(0.4, flippedSize(it.part, it.flip).h));
  }
  return beds;
}

export function liftY(y: number, step: number, beds: number[] = [0], max = BED_MAX_Y): number {
  const raw = snapTo(y, step);
  const clamped = Math.max(0, Math.min(max, raw));
  const magnet = Math.max(1.1, (step > 0 ? step : 1) * 0.55);
  let best = clamped;
  let dist = magnet;
  for (const b of beds) {
    const d = Math.abs(b - clamped);
    if (d < dist) {
      dist = d;
      best = Math.max(0, Math.min(max, b));
    }
  }
  return best;
}

/** Envelope after a tumble flip about X. */
export function flippedSize(part: Part, flip = 0): { w: number; d: number; h: number } {
  const f = wrapAngle(flip);
  if (f === 90 || f === 270) return { w: part.width, d: part.thick, h: part.height };
  return { w: part.width, d: part.height, h: part.thick };
}

/** Lift the mesh so a flipped solid still sits on y = 0. */
export function sitOffsetY(part: Part, flip = 0): number {
  const f = wrapAngle(flip);
  if (f === 90 || f === 270) return part.height / 2;
  if (f === 180) return part.thick;
  return 0;
}

export type InstBox = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  spanX: number;
  spanY: number;
  spanZ: number;
};

/** Axis-aligned span on the bed after yaw and flip. */
export function instBox(it: Inst): InstBox {
  const s = flippedSize(it.part, it.flip ?? 0);
  const yaw = wrapAngle(it.rot);
  const swap = (yaw > 45 && yaw < 135) || (yaw > 225 && yaw < 315);
  const w = swap ? s.d : s.w;
  const d = swap ? s.w : s.d;
  const minX = it.x - w / 2;
  const maxX = it.x + w / 2;
  const minY = it.y;
  const maxY = it.y + s.h;
  const minZ = it.z - d / 2;
  const maxZ = it.z + d / 2;
  return {
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    spanX: maxX - minX,
    spanY: maxY - minY,
    spanZ: maxZ - minZ,
  };
}

export function axisTicks(half: number, minor = 10, major = 50): { pos: number; major: boolean }[] {
  const out: { pos: number; major: boolean }[] = [];
  for (let v = -half; v <= half + 0.01; v += minor) {
    const pos = Math.round(v);
    out.push({ pos, major: pos % major === 0 });
  }
  return out;
}
