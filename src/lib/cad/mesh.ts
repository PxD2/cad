import {
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Path,
  Shape,
  Vector2,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { geometryForSolid } from "./solids";
import type { Part } from "./types";

function prep(g: BufferGeometry): BufferGeometry {
  return g.index ? g.toNonIndexed() : g;
}

function merge(geos: BufferGeometry[]): BufferGeometry | null {
  const ready = geos.filter(Boolean).map(prep);
  if (ready.length === 0) return null;
  if (ready.length === 1) return ready[0];
  return mergeGeometries(ready, false);
}

export function partGeometry(part: Part): BufferGeometry {
  if (part.mesh && part.mesh.length >= 9) {
    return meshGeometry(part.mesh);
  }
  if (part.solid && part.solid.kind && part.solid.kind !== "plate") {
    return geometryForSolid(part.solid);
  }
  if (part.solid?.kind === "plate") {
    return geometryForSolid(part.solid);
  }
  const tiles = part.tiles && part.tiles.length > 1 ? part.tiles : null;
  if (!tiles) {
    return plateGeo(part.width, part.height, part.thick, part.holes);
  }
  const geos = tiles.map((tile) => {
    const [tw, th, tt] = tile.size;
    const holes = tile.sockets.map((s) => ({ x: s.x, y: s.y, d: s.d }));
    const g = plateGeo(tw, th, tt, holes);
    const pegs = tile.pegs.map((p) => {
      const c = new CylinderGeometry(p.d / 2, p.d / 2, p.length, 24);
      c.translate(p.x, tt / 2 + p.length / 2, -p.y);
      return c;
    });
    const merged = merge([g, ...pegs]) ?? g;
    merged.translate(tile.origin[0], 0, -tile.origin[1]);
    return merged;
  });
  return merge(geos) ?? plateGeo(part.width, part.height, part.thick, part.holes);
}

export function meshGeometry(verts: number[]): BufferGeometry {
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(verts, 3));
  if (verts.length >= 9 && verts.length % 9 === 0) geo.computeVertexNormals();
  return geo;
}

function plateGeo(
  w: number,
  h: number,
  t: number,
  holes: { x: number; y: number; d: number }[],
): BufferGeometry {
  const hw = w / 2;
  const hh = h / 2;
  const shape = new Shape([
    new Vector2(-hw, -hh),
    new Vector2(hw, -hh),
    new Vector2(hw, hh),
    new Vector2(-hw, hh),
  ]);
  for (const hole of holes) {
    const r = Math.max(0.2, hole.d / 2);
    const path = new Path();
    path.absarc(hole.x, hole.y, r, 0, Math.PI * 2, true);
    shape.holes.push(path);
  }
  const geo = new ExtrudeGeometry(shape, {
    depth: t,
    bevelEnabled: false,
    curveSegments: 24,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, t / 2, 0);
  geo.computeVertexNormals();
  return geo;
}
