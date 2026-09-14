import {
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Sprite,
  SpriteMaterial,
} from "three";
import { axisTicks, instBox, type Inst } from "./assembly";
import { K2_PLUS } from "./printer";
import { fmtLen, type Unit } from "./units";

const COL_X = 0xb07070;
const COL_Y = 0x7d9b8a;
const COL_Z = 0x6a82a0;

function segs(pts: number[], color: number, opacity = 1) {
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(pts, 3));
  return new LineSegments(
    geo,
    new LineBasicMaterial({ color, transparent: opacity < 1, opacity, depthTest: true }),
  );
}

function label(text: string, color: number, x: number, y: number, z: number, scale = 14) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext("2d");
  if (!ctx) {
    const spr = new Sprite();
    spr.position.set(x, y, z);
    return spr;
  }
  ctx.clearRect(0, 0, 256, 64);
  const hex = `#${color.toString(16).padStart(6, "0")}`;
  ctx.fillStyle = hex;
  ctx.font = "600 28px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 32);
  const tex = new CanvasTexture(c);
  tex.needsUpdate = true;
  const spr = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.position.set(x, y, z);
  spr.scale.set(scale, scale * 0.25, 1);
  spr.userData.tex = tex;
  return spr;
}

/** Permanent side-axis (X, Z) and vertical (Y) rulers on the K2 bed. */
export function bedRulers(): Group {
  const g = new Group();
  g.name = "rulers";
  const half = K2_PLUS.x / 2;
  const xPts: number[] = [-half, 0.2, -half, half, 0.2, -half];
  const zPts: number[] = [-half, 0.2, -half, -half, 0.2, half];
  const yPts: number[] = [-half, 0, -half, -half, 100, -half];
  for (const t of axisTicks(half)) {
    const len = t.major ? 5 : 2.2;
    xPts.push(t.pos, 0.2, -half, t.pos, 0.2, -half - len);
    zPts.push(-half, 0.2, t.pos, -half - len, 0.2, t.pos);
    if (t.major) {
      g.add(label(String(t.pos), COL_X, t.pos, 4.5, -half - 12, 16));
      g.add(label(String(t.pos), COL_Z, -half - 12, 4.5, t.pos, 16));
    }
  }
  for (const t of axisTicks(100, 10, 20)) {
    if (t.pos < 0) continue;
    const len = t.major ? 5 : 2.2;
    yPts.push(-half, t.pos, -half, -half - len, t.pos, -half);
    if (t.major) g.add(label(String(t.pos), COL_Y, -half - 12, t.pos, -half, 14));
  }
  g.add(segs(xPts, COL_X));
  g.add(segs(zPts, COL_Z));
  g.add(segs(yPts, COL_Y, 0.75));
  g.add(label("X", COL_X, half + 10, 6, -half, 18));
  g.add(label("Z", COL_Z, -half, 6, half + 10, 18));
  g.add(label("Y", COL_Y, -half, 108, -half, 18));
  return g;
}

/** Dimension brackets for the selected solid — side spans + vertical height. */
export function selDims(it: Inst, unit: Unit): Group {
  const g = new Group();
  g.name = "dims";
  const b = instBox(it);
  const y0 = 0.45;
  const off = 8;
  const xPts = [
    b.minX, y0, b.minZ - off, b.maxX, y0, b.minZ - off,
    b.minX, y0, b.minZ - off + 2.2, b.minX, y0, b.minZ - off - 2.2,
    b.maxX, y0, b.minZ - off + 2.2, b.maxX, y0, b.minZ - off - 2.2,
  ];
  const zPts = [
    b.minX - off, y0, b.minZ, b.minX - off, y0, b.maxZ,
    b.minX - off + 2.2, y0, b.minZ, b.minX - off - 2.2, y0, b.minZ,
    b.minX - off + 2.2, y0, b.maxZ, b.minX - off - 2.2, y0, b.maxZ,
  ];
  const x1 = b.maxX + off;
  const z1 = b.maxZ;
  const yPts = [
    x1, b.minY, z1, x1, b.maxY, z1,
    x1 - 2.2, b.minY, z1, x1 + 2.2, b.minY, z1,
    x1 - 2.2, b.maxY, z1, x1 + 2.2, b.maxY, z1,
  ];
  g.add(segs(xPts, COL_X));
  g.add(segs(zPts, COL_Z));
  g.add(segs(yPts, COL_Y));
  g.add(label(`X ${fmtLen(b.spanX, unit)}`, COL_X, (b.minX + b.maxX) / 2, y0 + 5, b.minZ - off - 6, 22));
  g.add(label(`Z ${fmtLen(b.spanZ, unit)}`, COL_Z, b.minX - off - 6, y0 + 5, (b.minZ + b.maxZ) / 2, 22));
  g.add(label(`Y ${fmtLen(b.spanY, unit)}`, COL_Y, x1 + 8, (b.minY + b.maxY) / 2, z1, 22));
  return g;
}
