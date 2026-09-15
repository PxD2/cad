import {
  BoxGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { BeltPath } from "./belt.ts";

export function beltView(path: BeltPath, selected = false): Group {
  const g = new Group();
  g.name = "belt";
  if (!path.ok || path.points.length < 4) return g;
  const geo = ribbonGeo(path);
  if (!geo) return g;
  const mesh = new Mesh(
    geo,
    new MeshStandardMaterial({
      color: selected ? 0x2a3340 : 0x14161a,
      metalness: 0.08,
      roughness: 0.82,
      emissive: selected ? 0x6a7c8c : 0x000000,
      emissiveIntensity: selected ? 0.22 : 0,
      side: DoubleSide,
    }),
  );
  g.add(mesh);
  return g;
}

function ribbonGeo(path: BeltPath) {
  const pts = path.points;
  if (pts.length < 2) return null;
  const closed = pts.slice();
  const a0 = pts[0];
  const last = pts[pts.length - 1];
  if (Math.hypot(a0.x - last.x, a0.z - last.z) > 0.4) closed.push(a0);
  const boxes = [];
  const hw = Math.max(2.4, path.width);
  const ht = Math.max(0.9, path.thick);
  for (let i = 0; i < closed.length - 1; i++) {
    const a = closed[i];
    const b = closed[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.15) continue;
    const box = new BoxGeometry(len, hw, ht);
    box.translate(len / 2, 0, 0);
    box.rotateY(-Math.atan2(dz, dx));
    box.translate(a.x, a.y, a.z);
    boxes.push(box);
  }
  if (!boxes.length) return null;
  const merged = mergeGeometries(boxes, false);
  for (const b of boxes) b.dispose();
  return merged;
}
