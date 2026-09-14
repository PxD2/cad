import {
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Sprite,
  SpriteMaterial,
  Vector3,
} from "three";
import { K2_PLUS } from "./printer";
import { holeHits, laserLocks, type HoleHit, type LaserLock } from "./laser";
import type { Inst } from "./assembly";
import { fmtLen, type Unit } from "./units";

const COL_X = 0xff3a3a;
const COL_Y = 0x3dff6a;
const COL_Z = 0x3ec8ff;
const UP = new Vector3(0, 1, 0);
const DIR = new Vector3();

function beam(ax: number, ay: number, az: number, bx: number, by: number, bz: number, color: number, r: number, opacity: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.05) return null;
  DIR.set(dx / len, dy / len, dz / len);
  const mesh = new Mesh(
    new CylinderGeometry(r, r, len, 6),
    new MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
    }),
  );
  mesh.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  mesh.quaternion.setFromUnitVectors(UP, DIR);
  return mesh;
}

function segs(pts: number[], color: number, opacity = 1) {
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(pts, 3));
  return new LineSegments(
    geo,
    new LineBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false }),
  );
}

function tag(text: string, color: number, x: number, y: number, z: number, scale = 18) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext("2d");
  const spr = new Sprite();
  spr.position.set(x, y, z);
  if (!ctx) return spr;
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.font = "700 26px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 32);
  const tex = new CanvasTexture(c);
  tex.needsUpdate = true;
  spr.material = new SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  spr.scale.set(scale, scale * 0.25, 1);
  spr.userData.tex = tex;
  return spr;
}

function addBeam(
  g: Group,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  color: number,
  hot: boolean,
  locked: boolean,
) {
  const opacity = locked ? 0.98 : hot ? 0.88 : 0.38;
  const r = locked ? 1.7 : hot ? 1.15 : 0.55;
  g.add(segs([ax, ay, az, bx, by, bz], color, opacity));
  const halo = beam(ax, ay, az, bx, by, bz, color, r * 2.1, opacity * 0.22);
  const core = beam(ax, ay, az, bx, by, bz, color, r, opacity * 0.85);
  if (halo) g.add(halo);
  if (core) g.add(core);
}

function crosshair(hit: HoleHit, hot: boolean, locked: boolean): LineSegments {
  const s = Math.max(7, hit.d * 0.85 + 4);
  const o = locked ? 1 : hot ? 0.95 : 0.5;
  const pts: number[] = [
    hit.x - s, hit.y, hit.z, hit.x + s, hit.y, hit.z,
    hit.x, hit.y - s, hit.z, hit.x, hit.y + s, hit.z,
    hit.x, hit.y, hit.z - s, hit.x, hit.y, hit.z + s,
  ];
  return segs(pts, locked ? 0xfff0c8 : hot ? 0xffe8e0 : 0xc8d0d4, o);
}

/** False laser-level: cardinal beams through every hole, spanning the K2 bed. */
export function laserView(layers: Inst[], selId: string | null, unit: Unit): Group {
  const g = new Group();
  g.name = "lasers";
  const hits = holeHits(layers);
  if (!hits.length) return g;
  const locks = laserLocks(hits);
  const lockedX = new Set(locks.filter((l) => l.axis === "x").map((l) => round1(l.value)));
  const lockedY = new Set(locks.filter((l) => l.axis === "y").map((l) => round1(l.value)));
  const lockedZ = new Set(locks.filter((l) => l.axis === "z").map((l) => round1(l.value)));
  const half = K2_PLUS.x / 2;
  const top = K2_PLUS.y;
  const seen = new Set<string>();
  for (const h of hits) {
    const hot = !selId || h.instId === selId || h.instId === "brush";
    const onLock = lockedX.has(round1(h.x)) || lockedY.has(round1(h.y)) || lockedZ.has(round1(h.z));
    g.add(crosshair(h, hot, onLock));
    const kx = `x:${round1(h.y)}:${round1(h.z)}`;
    if (!seen.has(kx)) {
      seen.add(kx);
      addBeam(g, -half, h.y, h.z, half, h.y, h.z, COL_X, hot, lockedY.has(round1(h.y)) || lockedZ.has(round1(h.z)));
    }
    const kz = `z:${round1(h.x)}:${round1(h.y)}`;
    if (!seen.has(kz)) {
      seen.add(kz);
      addBeam(g, h.x, h.y, -half, h.x, h.y, half, COL_Z, hot, lockedX.has(round1(h.x)) || lockedY.has(round1(h.y)));
    }
    const ky = `y:${round1(h.x)}:${round1(h.z)}`;
    if (!seen.has(ky)) {
      seen.add(ky);
      addBeam(g, h.x, 0, h.z, h.x, top, h.z, COL_Y, hot, lockedX.has(round1(h.x)) || lockedZ.has(round1(h.z)));
    }
  }
  tagLocks(g, locks, selId, unit);
  return g;
}

function tagLocks(g: Group, locks: LaserLock[], selId: string | null, unit: Unit) {
  const used = new Set<string>();
  for (const l of locks) {
    if (selId && l.a.instId !== selId && l.b.instId !== selId) continue;
    const key = `${l.axis}:${round1(l.value)}`;
    if (used.has(key)) continue;
    used.add(key);
    const col = l.axis === "x" ? COL_X : l.axis === "y" ? COL_Y : COL_Z;
    const p = l.a;
    const label = `LOCK ${l.axis.toUpperCase()} ${fmtLen(l.value, unit)}`;
    if (l.axis === "x") g.add(tag(label, col, 0, p.y + 8, p.z + 10, 28));
    else if (l.axis === "z") g.add(tag(label, col, p.x + 10, p.y + 8, 0, 28));
    else g.add(tag(label, col, p.x + 10, l.value + 8, p.z, 28));
  }
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

