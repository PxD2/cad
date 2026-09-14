import type { BufferGeometry } from "three";
import { Vector3 } from "three";

export function geometryToAsciiStl(geo: BufferGeometry, name = "pxd2"): string {
  const pos = geo.getAttribute("position");
  const idx = geo.getIndex();
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const n = new Vector3();
  const lines = [`solid ${name}`];
  const pushTri = (i0: number, i1: number, i2: number) => {
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);
    n.subVectors(b, a).cross(c.clone().sub(a));
    if (n.lengthSq() === 0) return;
    n.normalize();
    lines.push(`  facet normal ${n.x} ${n.y} ${n.z}`);
    lines.push("    outer loop");
    lines.push(`      vertex ${a.x} ${a.y} ${a.z}`);
    lines.push(`      vertex ${b.x} ${b.y} ${b.z}`);
    lines.push(`      vertex ${c.x} ${c.y} ${c.z}`);
    lines.push("    endloop");
    lines.push("  endfacet");
  };
  if (idx) {
    for (let i = 0; i < idx.count; i += 3) pushTri(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2));
  } else {
    for (let i = 0; i < pos.count; i += 3) pushTri(i, i + 1, i + 2);
  }
  lines.push(`endsolid ${name}`);
  return lines.join("\n");
}

export function parseAsciiStl(text: string): { verts: number[]; count: number } {
  const verts: number[] = [];
  const re = /vertex\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) verts.push(Number(m[1]), Number(m[2]), Number(m[3]));
  return { verts, count: verts.length / 9 };
}

export function parseStlBuffer(buf: ArrayBuffer): number[] {
  const bytes = new Uint8Array(buf);
  if (buf.byteLength < 84) {
    return parseAsciiStl(new TextDecoder().decode(bytes)).verts;
  }
  const tri = new DataView(buf).getUint32(80, true);
  const expected = 84 + tri * 50;
  const head = new TextDecoder().decode(bytes.slice(0, 5));
  if (expected === buf.byteLength || (head !== "solid" && tri > 0 && expected <= buf.byteLength + 50)) {
    return parseBinaryStl(buf, tri);
  }
  return parseAsciiStl(new TextDecoder().decode(bytes)).verts;
}

function parseBinaryStl(buf: ArrayBuffer, triCount: number): number[] {
  const dv = new DataView(buf);
  const verts: number[] = [];
  let o = 84;
  const n = Math.min(triCount, 200_000);
  for (let i = 0; i < n; i++) {
    o += 12;
    for (let v = 0; v < 3; v++) {
      verts.push(dv.getFloat32(o, true), dv.getFloat32(o + 4, true), dv.getFloat32(o + 8, true));
      o += 12;
    }
    o += 2;
  }
  return verts;
}
