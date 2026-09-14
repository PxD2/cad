import { emitBlender, emitCadQuery, emitDxf, emitFreeCad } from "./emit";
import { compileScad } from "./scad";
import { geometryToAsciiStl, parseStlBuffer } from "./stl";
import { partGeometry } from "./mesh";
import { scadFromPart } from "./intent";
import type { Hole, Part } from "./types";
import { parseUnitToken, toMm } from "./units";

export type ImportHit = {
  kind: "part" | "mesh";
  name: string;
  part?: Part;
  scad?: string;
  verts?: number[];
  note: string;
};

const MAX_VERTS = 80_000;

export function downsample(verts: number[], max = MAX_VERTS): number[] {
  const n = verts.length / 3;
  if (n <= max) return verts;
  const stride = Math.ceil(n / max);
  const out: number[] = [];
  for (let i = 0; i < n; i += stride) {
    const o = i * 3;
    out.push(verts[o], verts[o + 1], verts[o + 2]);
  }
  return out;
}

export function bboxOf(verts: number[]): { w: number; h: number; t: number } {
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity,
    maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;
  for (let i = 0; i < verts.length; i += 3) {
    minX = Math.min(minX, verts[i]);
    minY = Math.min(minY, verts[i + 1]);
    minZ = Math.min(minZ, verts[i + 2]);
    maxX = Math.max(maxX, verts[i]);
    maxY = Math.max(maxY, verts[i + 1]);
    maxZ = Math.max(maxZ, verts[i + 2]);
  }
  return {
    w: Math.max(1, maxX - minX),
    h: Math.max(1, maxY - minY),
    t: Math.max(0.4, maxZ - minZ),
  };
}

function meshPart(name: string, verts: number[], ask: string): Part {
  const b = bboxOf(verts);
  const dims = [b.w, b.h, b.t].sort((a, c) => c - a);
  return {
    name,
    width: round1(dims[0]),
    height: round1(dims[1]),
    thick: round1(Math.min(dims[2], 80)),
    holes: [],
    tiles: null,
    ask,
    notes: [`Imported mesh bbox ${round1(b.w)}×${round1(b.h)}×${round1(b.t)} mm`],
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function parseObj(text: string): number[] {
  const verts: number[][] = [];
  const out: number[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("v ")) {
      const p = line.trim().split(/\s+/);
      verts.push([Number(p[1]), Number(p[2]), Number(p[3])]);
    } else if (line.startsWith("f ")) {
      const idx = line
        .trim()
        .split(/\s+/)
        .slice(1)
        .map((t) => Number(t.split("/")[0]) - 1);
      for (let i = 1; i < idx.length - 1; i++) {
        for (const k of [idx[0], idx[i], idx[i + 1]]) {
          const v = verts[k];
          if (v) out.push(v[0], v[1], v[2]);
        }
      }
    }
  }
  return downsample(out);
}

export function parsePly(text: string): number[] {
  const lines = text.split(/\r?\n/);
  let nV = 0;
  let headerEnd = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith("element vertex")) nV = Number(l.split(/\s+/)[2]);
    if (l.startsWith("end_header")) {
      headerEnd = i + 1;
      break;
    }
  }
  const verts: number[] = [];
  for (let i = 0; i < nV && headerEnd + i < lines.length; i++) {
    const p = lines[headerEnd + i].trim().split(/\s+/);
    if (p.length >= 3) verts.push(Number(p[0]), Number(p[1]), Number(p[2]));
  }
  return downsample(verts);
}

export function parseXyz(text: string): number[] {
  const verts: number[] = [];
  for (const line of text.split(/\r?\n/)) {
    const p = line.trim().split(/[\s,]+/);
    if (p.length >= 3 && Number.isFinite(Number(p[0]))) verts.push(Number(p[0]), Number(p[1]), Number(p[2]));
  }
  return downsample(verts);
}

export function parseDxf(text: string): { holes: Hole[]; width: number; height: number } {
  const lines = text.split(/\r?\n/);
  const holes: Hole[] = [];
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const bump = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (let i = 0; i < lines.length; i++) {
    const code = lines[i].trim();
    const val = (lines[i + 1] ?? "").trim();
    if (code === "0" && val === "CIRCLE") {
      let x = 0,
        y = 0,
        r = 3;
      for (let j = i + 2; j < Math.min(i + 40, lines.length); j += 2) {
        const c = lines[j].trim();
        const v = Number(lines[j + 1]);
        if (c === "10") x = v;
        if (c === "20") y = v;
        if (c === "40") r = v;
        if (c === "0") break;
      }
      holes.push({ x, y, d: r * 2 });
      bump(x - r, y - r);
      bump(x + r, y + r);
    }
    if (code === "0" && val === "LINE") {
      let x1 = 0,
        y1 = 0,
        x2 = 0,
        y2 = 0;
      for (let j = i + 2; j < Math.min(i + 40, lines.length); j += 2) {
        const c = lines[j].trim();
        const v = Number(lines[j + 1]);
        if (c === "10") x1 = v;
        if (c === "20") y1 = v;
        if (c === "11") x2 = v;
        if (c === "21") y2 = v;
        if (c === "0") break;
      }
      bump(x1, y1);
      bump(x2, y2);
    }
  }
  if (!Number.isFinite(minX)) return { holes, width: 80, height: 60 };
  return { holes, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

export async function importFile(file: File): Promise<ImportHit> {
  const name = file.name.replace(/\.[^.]+$/, "") || "import";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "stl") {
    const buf = await file.arrayBuffer();
    const ds = downsample(parseStlBuffer(buf));
    return {
      kind: "mesh",
      name,
      part: meshPart(name, ds, `imported ${file.name}`),
      verts: ds,
      note: `STL ${Math.round(ds.length / 3)} verts`,
    };
  }
  const text = await file.text();
  if (ext === "scad") {
    const part = compileScad(text, name);
    return { kind: "part", name, part, scad: text, note: "OpenSCAD compiled" };
  }
  if (ext === "json") {
    const j = JSON.parse(text) as Partial<Part> & { scad?: string; units?: string };
    if (!j.width || !j.height) throw new Error("JSON is not a part card.");
    const u = parseUnitToken(j.units) ?? "mm";
    const mm = (n: number) => toMm(n, u);
    const part: Part = {
      name: j.name || name,
      width: mm(j.width),
      height: mm(j.height),
      thick: mm(j.thick || (u === "in" ? 0.25 : 6)),
      holes: Array.isArray(j.holes)
        ? j.holes.map((h) => ({ x: mm(h.x), y: mm(h.y), d: mm(h.d) }))
        : [],
      tiles: j.tiles ?? null,
      ask: j.ask || "json import",
      notes: j.notes || ["json import"],
      solid: j.solid ?? null,
    };
    return { kind: "part", name, part, scad: j.scad || scadFromPart(part), note: `Part card · ${u}` };
  }
  if (ext === "obj") {
    const verts = parseObj(text);
    return { kind: "mesh", name, part: meshPart(name, verts, `imported ${file.name}`), verts, note: "OBJ mesh" };
  }
  if (ext === "ply" || ext === "asc" || ext === "xyz") {
    const verts = ext === "xyz" ? parseXyz(text) : parsePly(text);
    return { kind: "mesh", name, part: meshPart(name, verts, `imported ${file.name}`), verts, note: `${ext.toUpperCase()} cloud` };
  }
  if (ext === "dxf") {
    const d = parseDxf(text);
    const part = plateFromProfile(name, d.width, d.height, 6, d.holes);
    return { kind: "part", name, part, scad: scadFromPart(part), note: `DXF ${d.holes.length} circle(s)` };
  }
  throw new Error(`No in-browser kernel for .${ext}. Emit FreeCAD/Blender instead.`);
}

function plateFromProfile(name: string, w: number, h: number, t: number, holes: Hole[]): Part {
  return { name, width: w, height: h, thick: t, holes, tiles: null, ask: "dxf import", notes: ["DXF profile"] };
}

export type OutFmt = "stl" | "dxf" | "scad" | "cq" | "fc" | "blend" | "json" | "csv";

export function exportPayload(part: Part, scad: string, fmt: OutFmt): { filename: string; text: string; mime: string } {
  const n = part.name.replace(/[^\w.-]+/g, "_") || "part";
  switch (fmt) {
    case "stl": {
      const geo = partGeometry(part);
      const text = geometryToAsciiStl(geo, n);
      geo.dispose();
      return { filename: `${n}.stl`, text, mime: "model/stl" };
    }
    case "dxf":
      return { filename: `${n}.dxf`, text: emitDxf(part), mime: "application/dxf" };
    case "scad":
      return { filename: `${n}.scad`, text: scad, mime: "text/plain" };
    case "cq":
      return { filename: `${n}_cadquery.py`, text: emitCadQuery(part), mime: "text/x-python" };
    case "fc":
      return { filename: `${n}_freecad.py`, text: emitFreeCad(part), mime: "text/x-python" };
    case "blend":
      return { filename: `${n}_blender.py`, text: emitBlender(part), mime: "text/x-python" };
    case "csv":
      return {
        filename: `${n}_holes.csv`,
        text: ["x,y,d", ...part.holes.map((h) => `${h.x},${h.y},${h.d}`)].join("\n"),
        mime: "text/csv",
      };
    default:
      return {
        filename: `${n}.json`,
        text: JSON.stringify({ ...part, scad, units: "mm" }, null, 2),
        mime: "application/json",
      };
  }
}

export function downloadPayload(part: Part, scad: string, fmt: OutFmt) {
  const { filename, text, mime } = exportPayload(part, scad, fmt);
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return filename;
}
