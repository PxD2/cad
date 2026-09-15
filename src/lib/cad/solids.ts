import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Path,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { SolidSpec } from "./solid-spec.ts";
export type { SolidKind, SolidSpec } from "./solid-spec.ts";
export { envelopeOf, parseBeniPragma } from "./solid-spec.ts";

export function geometryForSolid(s: SolidSpec): BufferGeometry {
  switch (s.kind) {
    case "spur":
      return spurGeo(s.teeth ?? 20, s.module ?? 2, s.bore ?? 5, s.t ?? 8);
    case "herringbone":
      return herringboneGeo(s.teeth ?? 24, s.module ?? 2, s.bore ?? 6, s.t ?? 12);
    case "rack":
      return rackGeo(s.teeth ?? 16, s.module ?? 2, s.t ?? 8);
    case "pulley":
      return pulleyGeo(s.teeth ?? 20, s.pitch ?? 2, s.bore ?? 5, s.t ?? 8);
    case "bearing":
      return bearingGeo(s.od ?? 22, s.id ?? 8, s.width ?? 7);
    case "coupling":
      return couplingGeo(s.od ?? 18, s.id ?? 5, s.length ?? 25);
    case "bracket":
      return bracketGeo(s.a ?? 40, s.b ?? 40, s.t ?? 4, s.hole ?? 4.5);
    case "standoff":
      return standoffGeo(s.od ?? 8, s.id ?? 3.4, s.height ?? 12);
    case "knob":
      return knobGeo(s.od ?? 32, s.flutes ?? 8, s.height ?? 14, s.bore ?? 6);
    case "nema":
      return nemaGeo((s.size as 8 | 11 | 14 | 17 | 23) || 17, s.t ?? 5);
    case "compound":
      return compoundGeo(s.teeth ?? 20, s.teeth2 ?? 40, s.module ?? 2, s.bore ?? 5, s.t ?? 16);
    case "bevel":
      return bevelGeo(s.teeth ?? 20, s.module ?? 2, s.bore ?? 5, s.t ?? 10);
    case "worm":
      return wormGeo(s.module ?? 2, s.length ?? 24, s.bore ?? 5);
    case "washer":
      return washerGeo(s.od ?? 16, s.id ?? 6.6, s.width ?? 2);
    case "nut":
      return nutGeo(s.od ?? 8, s.id ?? 3.4, s.height ?? 4);
    case "bushing":
      return bushingGeo(s.od ?? 16, s.id ?? 8, s.height ?? 12);
    case "hinge":
      return hingeGeo(s.a ?? 40, s.b ?? 16, s.t ?? 3);
    case "tslot":
      return tslotGeo(s.a ?? 20, s.length ?? 40);
    case "flange":
      return flangeGeo(s.od ?? 50, s.bore ?? 22, s.t ?? 6, s.hole ?? 4.5);
    case "bolt":
      return boltGeo(s.od ?? 5.5, s.id ?? 3, s.height ?? 16);
    case "cube":
      return cubeGeo(s.a ?? 20);
    case "xyzcube":
      return xyzCubeGeo(s.a ?? 20);
    case "box":
      return boxGeo(s.width ?? 80, s.height ?? 60, s.t ?? 25, 2.2);
    case "snapbox":
      return snapBoxGeo(s.width ?? 80, s.height ?? 60, s.t ?? 28);
    case "hook":
      return hookGeo(s.a ?? 18, s.b ?? 40, s.t ?? 8);
    case "headhook":
      return headHookGeo(s.a ?? 36, s.b ?? 52, s.t ?? 10);
    case "clip":
      return clipGeo(s.a ?? 16, s.b ?? 18, s.t ?? 10);
    case "beltclip":
      return beltClipGeo(s.a ?? 28, s.b ?? 18, s.t ?? 12);
    case "ledclip":
      return ledClipGeo(s.a ?? 12, s.b ?? 10, s.t ?? 8);
    case "stand":
      return standGeo(s.width ?? 70, s.height ?? 80, s.t ?? 4);
    case "opener":
      return openerGeo(s.length ?? 80);
    case "disk":
      return diskGeo(s.od ?? 90, s.t ?? 4);
    case "card":
      return cubeBox(85.6, 0.8, 54);
    case "bin":
      return boxGeo(s.width ?? 42, s.height ?? 42, s.t ?? 21, 1.6);
    case "grid":
      return gridGeo(s.size ?? 2);
    case "grill":
      return grillGeo(s.od ?? 40, s.t ?? 3);
    case "wrench":
      return wrenchGeo(s.length ?? 90, s.od ?? 13);
    case "comb":
      return combGeo(s.length ?? 40, s.flutes ?? 5);
    case "hull":
      return hullGeo();
    case "spinner":
      return spinnerGeo(s.od ?? 8, s.id ?? 5.5);
    case "ruler":
      return rulerGeo(s.length ?? 100);
    case "case":
      return boxGeo(s.width ?? 90, s.height ?? 60, s.t ?? 25, 2.4);
    case "collar":
      return collarGeo(s.od ?? 22, s.id ?? 8, s.t ?? 8);
    case "flexcoup":
      return flexCoupGeo(s.od ?? 20, s.id ?? 5, s.length ?? 28);
    case "idler":
      return idlerGeo(s.teeth ?? 20, s.pitch ?? 2, s.bore ?? 5, s.t ?? 8);
    case "gopro":
      return goproGeo();
    case "picam":
      return picamGeo();
    case "arm":
      return armGeo(s.a ?? 50);
    case "nameplate":
      return nameplateGeo(s.width ?? 80, s.height ?? 30);
    case "mushroom":
      return mushroomGeo(s.od ?? 28, s.height ?? 18, s.bore ?? 4);
    case "spool":
      return spoolGeo(s.width ?? 80, s.height ?? 70);
    case "plate":
      return cubeBox(s.width ?? 80, s.t ?? 6, s.height ?? 60);
    case "belt":
      return beltLoopGeo(s.teeth ?? 100, s.pitch ?? 2, s.t ?? 6);
    case "shaft":
      return shaftGeo(s.od ?? 8, s.length ?? 80, s.flutes ?? 0);
    case "leadscrew":
      return leadscrewGeo(s.od ?? 8, s.length ?? 150, s.pitch ?? 2);
    case "sprocket":
      return sprocketGeo(s.teeth ?? 15, s.pitch ?? 12.7, s.bore ?? 8, s.t ?? 8);
    case "spring":
      return springGeo(s.od ?? 12, s.id ?? 8, s.length ?? 30);
    case "rail":
      return railGeo(s.a ?? 12, s.length ?? 100);
    case "wheel":
      return wheelGeo(s.od ?? 80, s.bore ?? 8, s.t ?? 12);
    case "pipe":
      return pipeGeo(s.od ?? 21.3, s.id ?? 15.8, s.length ?? 80);
    case "servo":
      return servoGeo(s.width ?? 23, s.height ?? 12.5, s.t ?? 22);
    case "helical":
      return helicalGeo(s.teeth ?? 20, s.module ?? 2, s.bore ?? 5, s.t ?? 10);
    case "internal":
      return internalGeo(s.teeth ?? 40, s.module ?? 2, s.t ?? 8);
    case "insert":
      return insertGeo(s.od ?? 4.6, s.id ?? 3, s.height ?? 5);
    case "corner":
      return cornerGeo(s.a ?? 20);
    case "fan":
      return fanGeo(s.od ?? 40, s.t ?? 10);
    case "chain":
      return chainGeo(s.length ?? 50, s.t ?? 8);
    case "battery":
      return batteryGeo(s.width ?? 40, s.height ?? 22);
    case "arduino":
      return arduinoGeo();
    case "planetary":
      return planetaryGeo(s.teeth ?? 12, s.teeth2 ?? 36, s.module ?? 1.5, s.t ?? 8);
    default:
      return spurGeo(12, 2, 5, 6);
  }
}

function prep(g: BufferGeometry) {
  return g.index ? g.toNonIndexed() : g;
}

function merge(geos: BufferGeometry[]): BufferGeometry {
  const ready = geos.filter(Boolean).map(prep);
  if (ready.length === 1) return ready[0];
  return mergeGeometries(ready, false) ?? ready[0];
}

function extrude(shape: Shape, t: number): BufferGeometry {
  const geo = new ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 10 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, t / 2, 0);
  geo.computeVertexNormals();
  return geo;
}

function polar(r: number, a: number): [number, number] {
  return [r * Math.cos(a), r * Math.sin(a)];
}

/** Trapezoid-involute hybrid — pitch diameter is z·module, 20° flanks. */
export function spurShape(z: number, m: number, bore: number): Shape {
  const rP = (z * m) / 2;
  const rA = rP + m;
  const rF = Math.max(rP - 1.25 * m, bore / 2 + 0.5);
  const pitchHalf = Math.PI / z / 2;
  const tipHalf = pitchHalf * 0.55;
  const rootHalf = pitchHalf * 1.35;
  const pts: Vector2[] = [];
  for (let i = 0; i < z; i++) {
    const a0 = (i * 2 * Math.PI) / z;
    const corners: [number, number][] = [
      polar(rF, a0 - rootHalf),
      polar(rP, a0 - pitchHalf),
      polar(rA, a0 - tipHalf),
      polar(rA, a0 + tipHalf),
      polar(rP, a0 + pitchHalf),
      polar(rF, a0 + rootHalf),
    ];
    for (const [x, y] of corners) pts.push(new Vector2(x, y));
  }
  const shape = new Shape(pts);
  if (bore > 0.4) {
    const hole = new Path();
    hole.absarc(0, 0, bore / 2, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  return shape;
}

export function spurGeo(z: number, m: number, bore: number, t: number): BufferGeometry {
  return extrude(spurShape(z, m, bore), t);
}

function herringboneGeo(z: number, m: number, bore: number, t: number): BufferGeometry {
  const h = t / 2;
  const a = spurGeo(z, m, bore, h);
  a.translate(0, -h / 2, 0);
  const b = spurGeo(z, m, bore, h);
  b.rotateY(Math.PI / z);
  b.translate(0, h / 2, 0);
  return merge([a, b]);
}

function rackGeo(z: number, m: number, t: number): BufferGeometry {
  const pitch = Math.PI * m;
  const length = z * pitch;
  const add = m;
  const ded = 1.25 * m;
  const base = t;
  const hw = length / 2;
  const toothW = pitch * 0.45;
  const pts: Vector2[] = [new Vector2(-hw, -base / 2)];
  for (let i = 0; i < z; i++) {
    const cx = -hw + pitch / 2 + i * pitch;
    pts.push(
      new Vector2(cx - toothW / 2, -base / 2 + (base / 2 - ded)),
      new Vector2(cx - toothW * 0.28, add),
      new Vector2(cx + toothW * 0.28, add),
      new Vector2(cx + toothW / 2, -base / 2 + (base / 2 - ded)),
    );
  }
  pts.push(new Vector2(hw, -base / 2), new Vector2(hw, -base / 2 - 0.01));
  const shape = new Shape(pts);
  return extrude(shape, t);
}

function pulleyGeo(z: number, pitch: number, bore: number, t: number): BufferGeometry {
  const r = (z * pitch) / (2 * Math.PI);
  const shape = spurShape(z, pitch / Math.PI, bore);
  const body = extrude(shape, t * 0.62);
  const flange = (od: number, y: number) => {
    const c = new CylinderGeometry(od / 2, od / 2, 1.2, 40);
    c.translate(0, y, 0);
    return c;
  };
  return merge([body, flange(r * 2 + 6, t / 2 - 0.6), flange(r * 2 + 6, -t / 2 + 0.6)]);
}

function bearingGeo(od: number, id: number, w: number): BufferGeometry {
  const outer = new CylinderGeometry(od / 2, od / 2, w, 48);
  const inner = new CylinderGeometry(id / 2 + 1.6, id / 2 + 1.6, w * 1.02, 32);
  const bore = new CylinderGeometry(id / 2, id / 2, w * 1.1, 32);
  const race = new CylinderGeometry((od + id) / 4 + 0.4, (od + id) / 4 + 0.4, w * 0.55, 40);
  const balls: BufferGeometry[] = [];
  const n = 8;
  const pr = (od + id) / 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const s = new SphereGeometry(w * 0.28, 10, 8);
    s.translate(Math.cos(a) * pr, 0, Math.sin(a) * pr);
    balls.push(s);
  }
  void bore;
  void inner;
  return merge([outer, race, ...balls]);
}

function couplingGeo(od: number, id: number, len: number): BufferGeometry {
  const body = new CylinderGeometry(od / 2, od / 2, len, 28);
  const cuts: BufferGeometry[] = [];
  for (const y of [-len * 0.22, len * 0.22]) {
    const c = new CylinderGeometry(id / 2, id / 2, len * 0.55, 18);
    c.translate(0, y, 0);
    cuts.push(c);
  }
  const clamp = new CylinderGeometry(od / 2 + 1.2, od / 2 + 1.2, 4, 24);
  return merge([body, clamp, ...cuts]);
}

function bracketGeo(a: number, b: number, t: number, hole: number): BufferGeometry {
  const shape = new Shape([
    new Vector2(0, 0),
    new Vector2(a, 0),
    new Vector2(a, t),
    new Vector2(t, t),
    new Vector2(t, b),
    new Vector2(0, b),
  ]);
  for (const [x, y] of [
    [a * 0.55, t / 2],
    [t / 2, b * 0.55],
  ] as [number, number][]) {
    const p = new Path();
    p.absarc(x, y, hole / 2, 0, Math.PI * 2, true);
    shape.holes.push(p);
  }
  const geo = new ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 12 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(-a / 2, t / 2, b / 2);
  geo.computeVertexNormals();
  return geo;
}

function standoffGeo(od: number, id: number, h: number): BufferGeometry {
  const body = new CylinderGeometry(od / 2, od / 2, h, 20);
  const hex = new CylinderGeometry(od / 2, od / 2, h * 0.35, 6);
  hex.translate(0, 0, 0);
  void id;
  return merge([body, hex]);
}

function knobGeo(od: number, flutes: number, h: number, bore: number): BufferGeometry {
  const pts: Vector2[] = [];
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = od / 2 + Math.cos(a * flutes) * (od * 0.07);
    pts.push(new Vector2(r, 0));
  }
  const profile = [
    new Vector2(bore / 2, -h / 2),
    new Vector2(od / 2 * 0.7, -h / 2),
    new Vector2(od / 2, -h / 2 + h * 0.25),
    new Vector2(od / 2, h / 2 - 2),
    new Vector2(od / 2 * 0.55, h / 2),
    new Vector2(bore / 2, h / 2),
  ];
  const lathe = new LatheGeometry(profile, 36);
  lathe.computeVertexNormals();
  void pts;
  return lathe;
}

function nemaGeo(size: 8 | 11 | 14 | 17 | 23, t: number): BufferGeometry {
  const w = size === 8 ? 20.4 : size === 11 ? 28.2 : size === 14 ? 35.2 : size === 23 ? 56.4 : 42.3;
  const pattern = size === 8 ? 16 : size === 11 ? 23 : size === 14 ? 26 : size === 23 ? 47.14 : 31;
  const bore = size === 8 ? 16 : size === 23 ? 38.1 : 22;
  const hw = w / 2;
  const shape = new Shape([
    new Vector2(-hw, -hw),
    new Vector2(hw, -hw),
    new Vector2(hw, hw),
    new Vector2(-hw, hw),
  ]);
  const c = new Path();
  c.absarc(0, 0, bore / 2, 0, Math.PI * 2, true);
  shape.holes.push(c);
  const p = pattern / 2;
  for (const [x, y] of [
    [-p, -p],
    [p, -p],
    [p, p],
    [-p, p],
  ] as [number, number][]) {
    const h = new Path();
    h.absarc(x, y, 1.7, 0, Math.PI * 2, true);
    shape.holes.push(h);
  }
  return extrude(shape, t);
}

function compoundGeo(z1: number, z2: number, m: number, bore: number, t: number): BufferGeometry {
  const h = t / 2;
  const a = spurGeo(z1, m, bore, h);
  a.translate(0, -h / 2, 0);
  const b = spurGeo(z2, m, bore, h);
  b.translate(0, h / 2, 0);
  return merge([a, b]);
}

function bevelGeo(z: number, m: number, bore: number, t: number): BufferGeometry {
  const r = ((z + 2) * m) / 2;
  const cone = new CylinderGeometry(r * 0.55, r, t, Math.max(16, z));
  const teeth = spurGeo(z, m, bore, t * 0.45);
  teeth.translate(0, t * 0.2, 0);
  return merge([cone, teeth]);
}

function wormGeo(m: number, len: number, bore: number): BufferGeometry {
  const r = m * 2.2;
  const body = new CylinderGeometry(r, r, len, 24);
  const rings: BufferGeometry[] = [];
  const n = Math.max(4, Math.round(len / (m * 1.6)));
  for (let i = 0; i < n; i++) {
    const c = new CylinderGeometry(r + m * 0.55, r + m * 0.2, m * 0.7, 20);
    c.translate(0, -len / 2 + (i + 0.5) * (len / n), 0);
    rings.push(c);
  }
  void bore;
  return merge([body, ...rings]);
}

function washerGeo(od: number, id: number, t: number): BufferGeometry {
  const shape = new Shape();
  shape.absarc(0, 0, od / 2, 0, Math.PI * 2, false);
  const hole = new Path();
  hole.absarc(0, 0, id / 2, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return extrude(shape, t);
}

function nutGeo(od: number, id: number, h: number): BufferGeometry {
  const hex = new CylinderGeometry(od / 2, od / 2, h, 6);
  void id;
  return hex;
}

function hingeGeo(a: number, b: number, t: number): BufferGeometry {
  const leaf = (x: number) => {
    const shape = new Shape([
      new Vector2(-a / 4, -b / 2),
      new Vector2(a / 4, -b / 2),
      new Vector2(a / 4, b / 2),
      new Vector2(-a / 4, b / 2),
    ]);
    const g = extrude(shape, t);
    g.translate(x, 0, 0);
    return g;
  };
  const pin = new CylinderGeometry(t * 0.7, t * 0.7, b, 16);
  pin.rotateZ(Math.PI / 2);
  return merge([leaf(-a / 4), leaf(a / 4), pin]);
}

function tslotGeo(a: number, len: number): BufferGeometry {
  const s = a / 2;
  const slot = a * 0.28;
  const shape = new Shape([
    new Vector2(-s, -s),
    new Vector2(s, -s),
    new Vector2(s, -slot),
    new Vector2(slot, -slot),
    new Vector2(slot, s),
    new Vector2(-slot, s),
    new Vector2(-slot, -slot),
    new Vector2(-s, -slot),
  ]);
  const g = new ExtrudeGeometry(shape, { depth: len, bevelEnabled: false, curveSegments: 4 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, len / 2, 0);
  g.computeVertexNormals();
  return g;
}

function flangeGeo(od: number, bore: number, t: number, hole: number): BufferGeometry {
  const shape = new Shape();
  shape.absarc(0, 0, od / 2, 0, Math.PI * 2, false);
  const c = new Path();
  c.absarc(0, 0, bore / 2, 0, Math.PI * 2, true);
  shape.holes.push(c);
  const pcd = od * 0.72;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const h = new Path();
    h.absarc(Math.cos(a) * (pcd / 2), Math.sin(a) * (pcd / 2), hole / 2, 0, Math.PI * 2, true);
    shape.holes.push(h);
  }
  return extrude(shape, t);
}

function boltGeo(head: number, shank: number, len: number): BufferGeometry {
  const hex = new CylinderGeometry(head / 2, head / 2, head * 0.6, 6);
  hex.translate(0, len / 2 - head * 0.2, 0);
  const sh = new CylinderGeometry(shank / 2, shank / 2, len, 16);
  return merge([hex, sh]);
}

function cubeBox(w: number, t: number, d: number): BufferGeometry {
  const g = new BoxGeometry(w, t, d);
  g.translate(0, t / 2, 0);
  return g;
}

function cubeGeo(a: number): BufferGeometry {
  return cubeBox(a, a, a);
}

function boxGeo(w: number, d: number, h: number, wall: number): BufferGeometry {
  const bottom = cubeBox(w, wall, d);
  const long = (z: number) => {
    const g = cubeBox(w, h, wall);
    g.translate(0, 0, z);
    return g;
  };
  const short = (x: number) => {
    const g = cubeBox(wall, h, d - wall * 2);
    g.translate(x, 0, 0);
    return g;
  };
  return merge([bottom, long(d / 2 - wall / 2), long(-(d / 2 - wall / 2)), short(w / 2 - wall / 2), short(-(w / 2 - wall / 2))]);
}

function hookGeo(a: number, b: number, t: number): BufferGeometry {
  const back = cubeBox(a, b, t);
  const bend = new CylinderGeometry(t * 0.7, t * 0.7, a, 16, 1, false, 0, Math.PI);
  bend.rotateZ(Math.PI / 2);
  bend.translate(0, t * 0.4, t * 0.9);
  const lip = cubeBox(a, t, t * 1.4);
  lip.translate(0, 0, t * 1.6);
  return merge([back, bend, lip]);
}

function clipGeo(a: number, b: number, t: number): BufferGeometry {
  const gap = Math.max(2.2, a * 0.28);
  const left = cubeBox(a * 0.35, t, b);
  left.translate(-(gap / 2 + a * 0.18), 0, 0);
  const right = cubeBox(a * 0.35, t, b);
  right.translate(gap / 2 + a * 0.18, 0, 0);
  const top = cubeBox(a, t * 0.45, b * 0.35);
  top.translate(0, t * 0.35, b * 0.32);
  return merge([left, right, top]);
}

function standGeo(w: number, h: number, t: number): BufferGeometry {
  const base = cubeBox(w, t, 28);
  const back = cubeBox(w * 0.92, h * 0.7, t);
  back.translate(0, h * 0.12, -10);
  back.rotateX(-0.35);
  return merge([base, back]);
}

function openerGeo(len: number): BufferGeometry {
  const bar = cubeBox(len, 8, 16);
  const cap = new CylinderGeometry(7, 7, 8, 24);
  cap.translate(-len / 2 + 12, 4, 0);
  const lift = cubeBox(10, 4, 4);
  lift.translate(-len / 2 + 22, 2, 8);
  return merge([bar, cap, lift]);
}

function diskGeo(od: number, t: number): BufferGeometry {
  const g = new CylinderGeometry(od / 2, od / 2, t, 40);
  g.translate(0, t / 2, 0);
  return g;
}

function gridGeo(n: number): BufferGeometry {
  const pitch = 42;
  const w = n * pitch;
  const base = cubeBox(w, 4.75, w);
  const magnets: BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = (i + 0.5) * pitch - w / 2;
      const z = (j + 0.5) * pitch - w / 2;
      const boss = new CylinderGeometry(3.2, 3.2, 2, 16);
      boss.translate(x, 5.2, z);
      magnets.push(boss);
    }
  }
  return merge([base, ...magnets]);
}

function grillGeo(od: number, t: number): BufferGeometry {
  const ring = diskGeo(od, t);
  const hub = diskGeo(od * 0.28, t + 0.4);
  const bars: BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const bar = cubeBox(od * 0.9, t, 2.2);
    bar.rotateY((i * Math.PI) / 6);
    bars.push(bar);
  }
  return merge([ring, hub, ...bars]);
}

function wrenchGeo(len: number, hex: number): BufferGeometry {
  const handle = cubeBox(len * 0.55, 6, 8);
  const head = cubeBox(hex * 1.8, 6, hex * 1.6);
  head.translate(len / 2 - hex, 0, 0);
  const jaw = new CylinderGeometry(hex * 0.55, hex * 0.55, 7, 6);
  jaw.translate(len / 2 - hex * 0.4, 3, 0);
  return merge([handle, head, jaw]);
}

function combGeo(len: number, n: number): BufferGeometry {
  const bar = cubeBox(len, 8, 12);
  const teeth: BufferGeometry[] = [];
  const pitch = len / (n + 1);
  for (let i = 0; i < n; i++) {
    const t = cubeBox(1.6, 6, 10);
    t.translate(-len / 2 + (i + 1) * pitch, 7, 0);
    teeth.push(t);
  }
  return merge([bar, ...teeth]);
}

function hullGeo(): BufferGeometry {
  const hull = new Shape([
    new Vector2(-30, -11),
    new Vector2(18, -11),
    new Vector2(30, 0),
    new Vector2(18, 11),
    new Vector2(-30, 11),
    new Vector2(-28, 0),
  ]);
  const body = extrude(hull, 14);
  const cabin = cubeBox(18, 16, 14);
  cabin.translate(-8, 14, 0);
  const stack = new CylinderGeometry(3.6, 4.2, 14, 12);
  stack.translate(6, 30, 0);
  const keel = cubeBox(36, 6, 6);
  keel.translate(-4, -3, 0);
  const gunwaleL = cubeBox(44, 3, 2);
  gunwaleL.translate(-4, 14, 10);
  const gunwaleR = cubeBox(44, 3, 2);
  gunwaleR.translate(-4, 14, -10);
  return merge([body, cabin, stack, keel, gunwaleL, gunwaleR]);
}

function spinnerGeo(od: number, id: number): BufferGeometry {
  const hex = new CylinderGeometry(od / 2, od / 2, 10, 6);
  hex.translate(0, 5, 0);
  const arm = cubeBox(od * 3.2, 6, 8);
  arm.translate(0, 16, 0);
  void id;
  return merge([hex, arm]);
}

function bushingGeo(od: number, id: number, h: number): BufferGeometry {
  const shape = new Shape();
  shape.absarc(0, 0, od / 2, 0, Math.PI * 2, false);
  const hole = new Path();
  hole.absarc(0, 0, Math.max(1, id / 2), 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const body = extrude(shape, h);
  const fl = new Shape();
  fl.absarc(0, 0, od / 2 + 4, 0, Math.PI * 2, false);
  const fh = new Path();
  fh.absarc(0, 0, Math.max(1, id / 2), 0, Math.PI * 2, true);
  fl.holes.push(fh);
  const flange = extrude(fl, 2.6);
  return merge([body, flange]);
}

function xyzCubeGeo(a: number): BufferGeometry {
  const cube = cubeGeo(a);
  const bar = (w: number, t: number, d: number, x: number, y: number, z: number) => {
    const g = cubeBox(w, t, d);
    g.translate(x, y, z);
    return g;
  };
  const xBar = bar(a * 0.7, 1.6, 1.6, 0, a * 0.55, a * 0.42);
  const yBar = bar(1.6, a * 0.7, 1.6, a * 0.42, a * 0.15, 0);
  const zBar = bar(1.6, 1.6, a * 0.7, -a * 0.42, a * 0.55, 0);
  return merge([cube, xBar, yBar, zBar]);
}

function collarGeo(od: number, id: number, t: number): BufferGeometry {
  const shape = new Shape();
  shape.absarc(0, 0, od / 2, 0.12, Math.PI * 2 - 0.12, false);
  const hole = new Path();
  hole.absarc(0, 0, id / 2, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const ring = extrude(shape, t);
  const clamp = cubeBox(8, t, 10);
  clamp.translate(od / 2 + 2, 0, 0);
  const screw = new CylinderGeometry(2, 2, 10, 12);
  screw.rotateZ(Math.PI / 2);
  screw.translate(od / 2 + 2, t / 2, 0);
  return merge([ring, clamp, screw]);
}

function flexCoupGeo(od: number, id: number, len: number): BufferGeometry {
  const hubA = new CylinderGeometry(od / 2, od / 2, 6, 24);
  hubA.translate(0, 3, 0);
  const hubB = new CylinderGeometry(od / 2, od / 2, 6, 24);
  hubB.translate(0, len - 3, 0);
  const rings: BufferGeometry[] = [];
  const n = 5;
  for (let i = 0; i < n; i++) {
    const r = new CylinderGeometry(od / 2 - 1.2, od / 2 - 0.4, 2.2, 20);
    r.translate(0, 7 + i * ((len - 14) / Math.max(1, n - 1)), 0);
    rings.push(r);
  }
  void id;
  return merge([hubA, hubB, ...rings]);
}

function idlerGeo(z: number, pitch: number, bore: number, t: number): BufferGeometry {
  const r = (z * pitch) / (2 * Math.PI);
  const shape = new Shape();
  shape.absarc(0, 0, r, 0, Math.PI * 2, false);
  const hole = new Path();
  hole.absarc(0, 0, bore / 2, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const body = extrude(shape, t * 0.62);
  const flange = (y: number) => {
    const c = new CylinderGeometry(r + 3, r + 3, 1.4, 40);
    c.translate(0, y, 0);
    return c;
  };
  return merge([body, flange(t / 2 - 0.7), flange(-t / 2 + 0.7)]);
}

function beltClipGeo(a: number, b: number, t: number): BufferGeometry {
  const base = cubeBox(a, t * 0.45, b);
  const left = cubeBox(3, t, b);
  left.translate(-(a / 2 - 1.5), 0, 0);
  const right = cubeBox(3, t, b);
  right.translate(a / 2 - 1.5, 0, 0);
  const teeth: BufferGeometry[] = [];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const ridge = cubeBox(1.1, 1.4, b * 0.8);
    ridge.translate(-a / 2 + 5 + i * 2, t * 0.45, 0);
    teeth.push(ridge);
  }
  return merge([base, left, right, ...teeth]);
}

function ledClipGeo(a: number, b: number, t: number): BufferGeometry {
  const back = cubeBox(a, t, 2);
  const top = cubeBox(a, 1.6, b);
  top.translate(0, t - 0.8, b / 2 - 1);
  const lip = cubeBox(a, 1.4, 1.6);
  lip.translate(0, 0.7, b - 1);
  return merge([back, top, lip]);
}

function headHookGeo(a: number, b: number, t: number): BufferGeometry {
  const plate = cubeBox(a, b * 0.45, t);
  const left = new CylinderGeometry(t * 0.55, t * 0.55, a * 0.45, 16, 1, false, 0, Math.PI);
  left.rotateZ(Math.PI / 2);
  left.translate(-a * 0.22, t * 0.4, t * 1.1);
  const right = new CylinderGeometry(t * 0.55, t * 0.55, a * 0.45, 16, 1, false, 0, Math.PI);
  right.rotateZ(Math.PI / 2);
  right.translate(a * 0.22, t * 0.4, t * 1.1);
  const lipL = cubeBox(a * 0.28, t, t * 1.2);
  lipL.translate(-a * 0.22, 0, t * 1.7);
  const lipR = cubeBox(a * 0.28, t, t * 1.2);
  lipR.translate(a * 0.22, 0, t * 1.7);
  return merge([plate, left, right, lipL, lipR]);
}

function goproGeo(): BufferGeometry {
  const base = cubeBox(32, 6, 22);
  const left = cubeBox(6, 18, 22);
  left.translate(-8, 6, 0);
  const right = cubeBox(6, 18, 22);
  right.translate(8, 6, 0);
  const pin = new CylinderGeometry(3.1, 3.1, 22, 16);
  pin.rotateZ(Math.PI / 2);
  pin.translate(0, 16, 0);
  const holeL = new CylinderGeometry(2.2, 2.2, 8, 12);
  holeL.rotateZ(Math.PI / 2);
  holeL.translate(-8, 16, 0);
  return merge([base, left, right, pin, holeL]);
}

function picamGeo(): BufferGeometry {
  const plate = cubeBox(25, 3, 24);
  const window = cubeBox(8.5, 3.4, 8.5);
  window.translate(0, 0.2, 2);
  const bosses: BufferGeometry[] = [];
  const pitchX = 21 / 2;
  const pitchZ = 12.8 / 2;
  for (const [x, z] of [
    [-pitchX, -pitchZ],
    [pitchX, -pitchZ],
    [pitchX, pitchZ],
    [-pitchX, pitchZ],
  ] as [number, number][]) {
    const b = new CylinderGeometry(1.6, 1.6, 3.6, 10);
    b.translate(x, 1.8, z);
    bosses.push(b);
  }
  return merge([plate, window, ...bosses]);
}

function armGeo(len: number): BufferGeometry {
  const bar = cubeBox(len, 6, 12);
  const upright = cubeBox(8, 16, 12);
  upright.translate(-len / 2 + 4, 6, 0);
  const cam = picamGeo();
  cam.translate(len / 2 - 12, 6, 0);
  return merge([bar, upright, cam]);
}

function nameplateGeo(w: number, h: number): BufferGeometry {
  const plate = cubeBox(w, 3, h);
  const footL = cubeBox(8, 8, 8);
  footL.translate(-w / 2 + 10, 0, 0);
  const footR = cubeBox(8, 8, 8);
  footR.translate(w / 2 - 10, 0, 0);
  return merge([plate, footL, footR]);
}

function mushroomGeo(od: number, h: number, bore: number): BufferGeometry {
  const profile = [
    new Vector2(bore / 2, 0),
    new Vector2(od * 0.22, 0),
    new Vector2(od * 0.22, h * 0.45),
    new Vector2(od / 2, h * 0.55),
    new Vector2(od / 2, h * 0.85),
    new Vector2(od * 0.2, h),
    new Vector2(bore / 2, h),
  ];
  const lathe = new LatheGeometry(profile, 28);
  lathe.computeVertexNormals();
  return lathe;
}

function spoolGeo(w: number, h: number): BufferGeometry {
  const base = cubeBox(w, 6, 28);
  const post = cubeBox(10, h, 10);
  post.translate(-w / 2 + 12, 0, 0);
  const arm = cubeBox(w * 0.7, 8, 10);
  arm.translate(w * 0.05, h - 4, 0);
  const forkL = cubeBox(8, 16, 8);
  forkL.translate(w / 2 - 16, h + 4, 8);
  const forkR = cubeBox(8, 16, 8);
  forkR.translate(w / 2 - 16, h + 4, -8);
  return merge([base, post, arm, forkL, forkR]);
}

function snapBoxGeo(w: number, d: number, h: number): BufferGeometry {
  const bin = boxGeo(w, d, h - 4, 2.2);
  const lip = cubeBox(w - 4, 3, d - 4);
  lip.translate(0, h - 4, 0);
  const latch = cubeBox(12, 6, 4);
  latch.translate(0, h - 2, d / 2 - 1);
  return merge([bin, lip, latch]);
}

function rulerGeo(len: number): BufferGeometry {
  const body = cubeBox(len, 3, 20);
  const ticks: BufferGeometry[] = [];
  for (let i = 0; i <= 10; i++) {
    const tall = i % 5 === 0;
    const t = cubeBox(0.8, 1.2, tall ? 8 : 4);
    t.translate(-len / 2 + i * (len / 10), 3, tall ? 6 : 8);
    ticks.push(t);
  }
  return merge([body, ...ticks]);
}

function beltLoopGeo(z: number, pitch: number, width: number): BufferGeometry {
  const r = z > 0 && pitch > 0 ? (z * pitch) / (2 * Math.PI) : 40;
  const tube = Math.max(0.7, width * 0.22);
  const torus = new TorusGeometry(Math.max(4, r), tube, 10, 48);
  torus.rotateX(Math.PI / 2);
  torus.translate(0, width / 2, 0);
  return torus;
}

function shaftGeo(od: number, len: number, flats: number): BufferGeometry {
  const body = new CylinderGeometry(od / 2, od / 2, len, 28);
  if (flats <= 0) return body;
  const flat = cubeBox(od * 0.22, len * 0.7, od * 0.08);
  flat.translate(od * 0.42, -len * 0.05, 0);
  return merge([body, flat]);
}

function leadscrewGeo(od: number, len: number, pitch: number): BufferGeometry {
  const core = new CylinderGeometry(od / 2 - 0.6, od / 2 - 0.6, len, 20);
  const rings: BufferGeometry[] = [];
  const n = Math.max(4, Math.floor(len / Math.max(1.2, pitch)));
  for (let i = 0; i < n; i++) {
    const t = new TorusGeometry(od / 2 - 0.2, 0.55, 6, 16);
    t.rotateX(Math.PI / 2);
    t.translate(0, -len / 2 + 2 + i * (len / n), 0);
    rings.push(t);
  }
  const ends = new CylinderGeometry(od / 2, od / 2, 4, 16);
  ends.translate(0, len / 2 - 2, 0);
  return merge([core, ends, ...rings]);
}

function sprocketGeo(z: number, pitch: number, bore: number, t: number): BufferGeometry {
  const body = spurGeo(z, pitch / Math.PI, bore, t);
  const hub = new CylinderGeometry(bore / 2 + 4, bore / 2 + 4, t + 2, 20);
  return merge([body, hub]);
}

function springGeo(od: number, id: number, len: number): BufferGeometry {
  const r = (od + id) / 4;
  const tube = Math.max(0.6, (od - id) / 4);
  const coils = Math.max(4, Math.round(len / (tube * 2.4)));
  const bits: BufferGeometry[] = [];
  for (let i = 0; i < coils; i++) {
    const t = new TorusGeometry(r, tube, 8, 16, Math.PI * 1.6);
    t.rotateX(Math.PI / 2);
    t.translate(0, (i / (coils - 1)) * len - len / 2, 0);
    t.rotateY((i * Math.PI) / 3);
    bits.push(t);
  }
  return merge(bits);
}

function railGeo(a: number, len: number): BufferGeometry {
  const rail = cubeBox(a, a * 0.7, len);
  const lipL = cubeBox(a * 0.18, a * 0.22, len);
  lipL.translate(-a * 0.38, a * 0.7, 0);
  const lipR = cubeBox(a * 0.18, a * 0.22, len);
  lipR.translate(a * 0.38, a * 0.7, 0);
  const carriage = cubeBox(a * 1.4, a * 0.7, a * 2.2);
  carriage.translate(0, a * 0.7, 0);
  return merge([rail, lipL, lipR, carriage]);
}

function wheelGeo(od: number, bore: number, t: number): BufferGeometry {
  const tire = new CylinderGeometry(od / 2, od / 2, t, 40);
  const hub = new CylinderGeometry(od / 5, od / 5, t + 2, 20);
  const boreC = new CylinderGeometry(bore / 2, bore / 2, t + 4, 16);
  void boreC;
  const spokes: BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const sp = cubeBox(od * 0.32, t * 0.4, t * 0.22);
    sp.translate(Math.cos(a) * od * 0.22, t * 0.3, Math.sin(a) * od * 0.22);
    sp.rotateY(-a);
    spokes.push(sp);
  }
  return merge([tire, hub, ...spokes]);
}

function pipeGeo(od: number, id: number, len: number): BufferGeometry {
  const outer = new CylinderGeometry(od / 2, od / 2, len, 28);
  const inner = new CylinderGeometry(id / 2, id / 2, len * 1.02, 20);
  void inner;
  const lip = new CylinderGeometry(od / 2 + 1.2, od / 2 + 1.2, 3, 28);
  lip.translate(0, len / 2 - 1.5, 0);
  return merge([outer, lip]);
}

function servoGeo(w: number, h: number, t: number): BufferGeometry {
  const body = cubeBox(w, t, h);
  const tab = cubeBox(w + 10, 2.2, h * 0.7);
  tab.translate(0, t * 0.55, 0);
  const spline = new CylinderGeometry(2.3, 2.3, 4, 16);
  spline.translate(w * 0.22, t + 2, 0);
  const horn = cubeBox(18, 1.6, 4);
  horn.translate(w * 0.22, t + 4.5, 0);
  return merge([body, tab, spline, horn]);
}

function helicalGeo(z: number, m: number, bore: number, t: number): BufferGeometry {
  const a = spurGeo(z, m, bore, t / 2);
  a.translate(0, -t / 4, 0);
  const b = spurGeo(z, m, bore, t / 2);
  b.rotateY(Math.PI / z);
  b.translate(0, t / 4, 0);
  return merge([a, b]);
}

function internalGeo(z: number, m: number, t: number): BufferGeometry {
  const rA = ((z + 4) * m) / 2;
  const shape = new Shape();
  shape.absarc(0, 0, rA, 0, Math.PI * 2, false);
  const inner = spurShape(z, m, 0);
  shape.holes.push(inner);
  return extrude(shape, t);
}

function insertGeo(od: number, id: number, h: number): BufferGeometry {
  const body = new CylinderGeometry(od / 2, od / 2, h, 8);
  const knurl: BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const k = cubeBox(od * 0.12, h * 0.7, od * 0.08);
    k.translate(Math.cos(a) * od * 0.48, 0, Math.sin(a) * od * 0.48);
    knurl.push(k);
  }
  void id;
  return merge([body, ...knurl]);
}

function cornerGeo(a: number): BufferGeometry {
  const cube = cubeBox(a, a, a);
  const bosses: BufferGeometry[] = [];
  for (const [x, y, z] of [
    [a * 0.28, a * 0.5, 0],
    [0, a * 0.5, a * 0.28],
    [0, a * 0.28, 0],
  ] as [number, number, number][]) {
    const c = new CylinderGeometry(2.6, 2.6, a * 0.7, 12);
    if (z !== 0) c.rotateX(Math.PI / 2);
    if (x !== 0) c.rotateZ(Math.PI / 2);
    c.translate(x, y, z);
    bosses.push(c);
  }
  return merge([cube, ...bosses]);
}

function fanGeo(od: number, t: number): BufferGeometry {
  const frame = cubeBox(od, t, od);
  const hub = new CylinderGeometry(od * 0.12, od * 0.12, t + 1, 16);
  hub.translate(0, t / 2, 0);
  const blades: BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const b = cubeBox(od * 0.38, t * 0.4, t * 0.18);
    b.translate(Math.cos(a) * od * 0.22, t * 0.5, Math.sin(a) * od * 0.22);
    b.rotateY(-a);
    blades.push(b);
  }
  return merge([frame, hub, ...blades]);
}

function chainGeo(len: number, t: number): BufferGeometry {
  const links: BufferGeometry[] = [];
  const pitch = 12.7;
  const n = Math.max(3, Math.round(len / pitch));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + i * pitch + pitch / 2;
    const ring = new TorusGeometry(3.4, 1.1, 8, 12);
    ring.rotateY(i % 2 ? Math.PI / 2 : 0);
    ring.translate(x, t / 2, 0);
    links.push(ring);
  }
  return merge(links);
}

function batteryGeo(w: number, h: number): BufferGeometry {
  const cradle = cubeBox(w, 6, h);
  const left = new CylinderGeometry(9, 9, w * 0.9, 20);
  left.rotateZ(Math.PI / 2);
  left.translate(0, 12, -h * 0.22);
  const right = new CylinderGeometry(9, 9, w * 0.9, 20);
  right.rotateZ(Math.PI / 2);
  right.translate(0, 12, h * 0.22);
  const wallL = cubeBox(3, 16, h);
  wallL.translate(-w / 2 + 1.5, 6, 0);
  const wallR = cubeBox(3, 16, h);
  wallR.translate(w / 2 - 1.5, 6, 0);
  return merge([cradle, left, right, wallL, wallR]);
}

function arduinoGeo(): BufferGeometry {
  const board = cubeBox(68.6, 1.6, 53.4);
  const usb = cubeBox(16, 4, 12);
  usb.translate(-68.6 / 2 + 8, 2, 53.4 / 2 - 8);
  const headers = cubeBox(48, 8, 5);
  headers.translate(4, 5, -53.4 / 2 + 8);
  const holes: BufferGeometry[] = [];
  for (const [x, z] of [
    [-30.5, 21],
    [24, 21],
    [-30.5, -24],
    [20, -24],
  ] as [number, number][]) {
    const b = new CylinderGeometry(1.6, 1.6, 3, 10);
    b.translate(x, 1.6, z);
    holes.push(b);
  }
  return merge([board, usb, headers, ...holes]);
}

function planetaryGeo(sun: number, ring: number, m: number, t: number): BufferGeometry {
  const sunG = spurGeo(sun, m, 5, t);
  const planetZ = Math.max(8, Math.round((ring - sun) / 2));
  const orbit = ((sun + planetZ) * m) / 2;
  const planets: BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const p = spurGeo(planetZ, m, 3, t * 0.9);
    p.translate(Math.cos(a) * orbit, 0, Math.sin(a) * orbit);
    planets.push(p);
  }
  const ringG = internalGeo(ring, m, t * 0.7);
  ringG.translate(0, t * 0.1, 0);
  return merge([sunG, ringG, ...planets]);
}




