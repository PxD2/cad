export type ScanPly = {
  id: string;
  name: string;
  verts: number[];
  offset: [number, number, number];
  rotZ: number;
  visible: boolean;
  color: number;
};

export const PLY_COLORS = [0x9aa7b4, 0xc4a574, 0x7d9b8a, 0x8aa0b8, 0xc47a74, 0xb8b09a];

export function newPlyId() {
  return `p${Date.now().toString(36)}${Math.floor(Math.random() * 36).toString(36)}`;
}

export function plyCount(verts: number[]) {
  return Math.floor(verts.length / 3);
}

export function transformedVerts(ply: ScanPly): number[] {
  const c = Math.cos((ply.rotZ * Math.PI) / 180);
  const s = Math.sin((ply.rotZ * Math.PI) / 180);
  const [ox, oy, oz] = ply.offset;
  const out = new Array(ply.verts.length);
  for (let i = 0; i < ply.verts.length; i += 3) {
    const x = ply.verts[i];
    const y = ply.verts[i + 1];
    const z = ply.verts[i + 2];
    out[i] = x * c - z * s + ox;
    out[i + 1] = y + oy;
    out[i + 2] = x * s + z * c + oz;
  }
  return out;
}

export function centroid(verts: number[]): [number, number, number] {
  let x = 0,
    y = 0,
    z = 0,
    n = 0;
  for (let i = 0; i < verts.length; i += 3) {
    x += verts[i];
    y += verts[i + 1];
    z += verts[i + 2];
    n++;
  }
  if (!n) return [0, 0, 0];
  return [x / n, y / n, z / n];
}

export function voxelDownsample(verts: number[], voxel = 0.8): number[] {
  const seen = new Map<string, number>();
  const out: number[] = [];
  const inv = 1 / Math.max(0.15, voxel);
  for (let i = 0; i < verts.length; i += 3) {
    const kx = Math.round(verts[i] * inv);
    const ky = Math.round(verts[i + 1] * inv);
    const kz = Math.round(verts[i + 2] * inv);
    const k = `${kx}|${ky}|${kz}`;
    if (seen.has(k)) continue;
    seen.set(k, 1);
    out.push(verts[i], verts[i + 1], verts[i + 2]);
  }
  return out;
}

export function statisticalOutlier(verts: number[], k = 6, stdMul = 1.45): number[] {
  const n = plyCount(verts);
  if (n < 12) return verts;
  const sample = n > 4000 ? stridePick(verts, 4000) : verts;
  const grid = hash(sample, 2.4);
  const dists: number[] = [];
  for (let i = 0; i < sample.length; i += 3) {
    dists.push(meanK(sample, i, k, grid, 2.4));
  }
  const mean = dists.reduce((a, b) => a + b, 0) / dists.length;
  const varr = dists.reduce((a, d) => a + (d - mean) ** 2, 0) / dists.length;
  const thresh = mean + stdMul * Math.sqrt(varr);
  const out: number[] = [];
  const live = hash(verts, 2.4);
  for (let i = 0; i < verts.length; i += 3) {
    if (meanK(verts, i, k, live, 2.4) <= thresh) out.push(verts[i], verts[i + 1], verts[i + 2]);
  }
  return out.length >= 9 ? out : verts;
}

export function morphFill(verts: number[], voxel = 1.2): number[] {
  const inv = 1 / voxel;
  const keys = new Set<string>();
  const cell = (x: number, y: number, z: number) => `${x}|${y}|${z}`;
  for (let i = 0; i < verts.length; i += 3) {
    keys.add(cell(Math.round(verts[i] * inv), Math.round(verts[i + 1] * inv), Math.round(verts[i + 2] * inv)));
  }
  const add: number[] = [];
  const neigh = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  for (const k of keys) {
    const [x, y, z] = k.split("|").map(Number);
    for (const [dx, dy, dz] of neigh) {
      const nx = x + dx,
        ny = y + dy,
        nz = z + dz;
      const nk = cell(nx, ny, nz);
      if (keys.has(nk)) continue;
      let hit = 0;
      for (const [ax, ay, az] of neigh) if (keys.has(cell(nx + ax, ny + ay, nz + az))) hit++;
      if (hit >= 4) {
        keys.add(nk);
        add.push(nx * voxel, ny * voxel, nz * voxel);
      }
    }
  }
  return add.length ? verts.concat(add) : verts;
}

export function occupancy(verts: number[], bins = [6, 6, 4]) {
  const [nx, ny, nz] = bins;
  const grid = new Array(nx * ny * nz).fill(0);
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
  const sx = (maxX - minX) / nx || 1;
  const sy = (maxY - minY) / ny || 1;
  const sz = (maxZ - minZ) / nz || 1;
  for (let i = 0; i < verts.length; i += 3) {
    const ix = Math.min(nx - 1, Math.max(0, Math.floor((verts[i] - minX) / sx)));
    const iy = Math.min(ny - 1, Math.max(0, Math.floor((verts[i + 1] - minY) / sy)));
    const iz = Math.min(nz - 1, Math.max(0, Math.floor((verts[i + 2] - minZ) / sz)));
    grid[ix + iy * nx + iz * nx * ny]++;
  }
  const empty = grid.filter((v) => v === 0).length / grid.length;
  return {
    bins: grid,
    empty,
    bbox: [minX, minY, minZ, maxX, maxY, maxZ] as const,
    n: plyCount(verts),
  };
}

export function mergePlies(plies: ScanPly[]): number[] {
  const out: number[] = [];
  for (const p of plies) {
    if (!p.visible) continue;
    const v = transformedVerts(p);
    for (let i = 0; i < v.length; i++) out.push(v[i]);
  }
  return out;
}

/** 2D rigid (X, yaw around Y, Z) ICP of source onto target. Returns extra offset + yaw. */
export function icpOnto(
  src: number[],
  dst: number[],
  iters = 8,
): { offset: [number, number, number]; rotZ: number } {
  const A = stridePick(src, 700);
  const B = stridePick(dst, 900);
  const grid = hash(B, 4);
  let yaw = 0;
  let ox = 0,
    oy = 0,
    oz = 0;
  for (let it = 0; it < iters; it++) {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    let sxx = 0,
      sxy = 0,
      syx = 0,
      syy = 0,
      cx = 0,
      cz = 0,
      tx = 0,
      tz = 0,
      ty = 0,
      used = 0;
    for (let i = 0; i < A.length; i += 3) {
      const x = A[i] * c - A[i + 2] * s + ox;
      const y = A[i + 1] + oy;
      const z = A[i] * s + A[i + 2] * c + oz;
      const n = nearest(x, y, z, B, grid, 4);
      if (!n) continue;
      cx += x;
      cz += z;
      tx += n[0];
      tz += n[2];
      ty += n[1] - y;
      sxx += x * n[0];
      sxy += x * n[2];
      syx += z * n[0];
      syy += z * n[2];
      used++;
    }
    if (used < 12) break;
    cx /= used;
    cz /= used;
    tx /= used;
    tz /= used;
    const ang = Math.atan2(sxy - syx, sxx + syy);
    yaw += ang * 0.65;
    ox += (tx - cx) * 0.8;
    oz += (tz - cz) * 0.8;
    oy += ty / used;
  }
  return { offset: [ox, oy, oz], rotZ: (yaw * 180) / Math.PI };
}

export function alignPlies(plies: ScanPly[]): ScanPly[] {
  const vis = plies.filter((p) => p.visible && p.verts.length >= 9);
  if (vis.length < 2) return plies;
  const ref = transformedVerts(vis[0]);
  return plies.map((p) => {
    if (p.id === vis[0].id || !p.visible) return p;
    const fit = icpOnto(transformedVerts(p), ref);
    return {
      ...p,
      offset: [p.offset[0] + fit.offset[0], p.offset[1] + fit.offset[1], p.offset[2] + fit.offset[2]],
      rotZ: p.rotZ + fit.rotZ,
    };
  });
}

export function cleanCloud(verts: number[], voxel = 0.8, stdMul = 1.4, fill = true): number[] {
  let v = statisticalOutlier(verts, 6, stdMul);
  v = voxelDownsample(v, voxel);
  if (fill) v = morphFill(v, Math.max(voxel * 1.4, 1));
  return v;
}

function stridePick(verts: number[], max: number): number[] {
  const n = plyCount(verts);
  if (n <= max) return verts;
  const step = Math.ceil(n / max);
  const out: number[] = [];
  for (let i = 0; i < n; i += step) {
    const o = i * 3;
    out.push(verts[o], verts[o + 1], verts[o + 2]);
  }
  return out;
}

type Grid = Map<string, number[]>;

function hash(verts: number[], cell: number): Grid {
  const g: Grid = new Map();
  const inv = 1 / cell;
  for (let i = 0; i < verts.length; i += 3) {
    const k = `${Math.round(verts[i] * inv)}|${Math.round(verts[i + 2] * inv)}`;
    const row = g.get(k);
    if (row) row.push(i);
    else g.set(k, [i]);
  }
  return g;
}

function meanK(verts: number[], i: number, k: number, grid: Grid, cell: number): number {
  const x = verts[i],
    y = verts[i + 1],
    z = verts[i + 2];
  const cx = Math.round(x / cell);
  const cz = Math.round(z / cell);
  const ds: number[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const row = grid.get(`${cx + dx}|${cz + dz}`);
      if (!row) continue;
      for (const j of row) {
        if (j === i) continue;
        const d = Math.hypot(verts[j] - x, verts[j + 1] - y, verts[j + 2] - z);
        ds.push(d);
      }
    }
  }
  if (!ds.length) return 99;
  ds.sort((a, b) => a - b);
  const take = ds.slice(0, k);
  return take.reduce((a, b) => a + b, 0) / take.length;
}

function nearest(
  x: number,
  y: number,
  z: number,
  verts: number[],
  grid: Grid,
  cell: number,
): [number, number, number] | null {
  const cx = Math.round(x / cell);
  const cz = Math.round(z / cell);
  let best = 64;
  let hit: [number, number, number] | null = null;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const row = grid.get(`${cx + dx}|${cz + dz}`);
      if (!row) continue;
      for (const j of row) {
        const d = Math.hypot(verts[j] - x, verts[j + 1] - y, verts[j + 2] - z);
        if (d < best) {
          best = d;
          hit = [verts[j], verts[j + 1], verts[j + 2]];
        }
      }
    }
  }
  return hit;
}
