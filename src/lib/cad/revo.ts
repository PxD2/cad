export type RevoDevice = {
  id: string;
  name: string;
  acc: number;
  voxel: number;
  formats: string;
  note: string;
};

export const REVO_DEVICES: RevoDevice[] = [
  { id: "generic", name: "Generic", acc: 0.1, voxel: 0.9, formats: "PLY OBJ STL ASC XYZ", note: "any Revo Scan dump → STL" },
  { id: "pop4", name: "POP 4", acc: 0.05, voxel: 0.8, formats: "PLY OBJ STL ASC", note: "structured light · 0.05 mm" },
  { id: "pop3", name: "POP 3", acc: 0.1, voxel: 1.0, formats: "PLY OBJ STL", note: "0.1 mm" },
  { id: "mini", name: "MINI", acc: 0.02, voxel: 0.55, formats: "PLY OBJ STL", note: "small parts" },
  { id: "range", name: "RANGE", acc: 0.1, voxel: 1.2, formats: "PLY OBJ STL", note: "large objects" },
  { id: "miraco", name: "MIRACO", acc: 0.05, voxel: 0.85, formats: "PLY OBJ STL", note: "handheld" },
  { id: "inspire", name: "INSPIRE", acc: 0.1, voxel: 1.0, formats: "PLY OBJ STL", note: "entry" },
];

export function revoById(id: string) {
  return REVO_DEVICES.find((d) => d.id === id) ?? REVO_DEVICES[0];
}

/** Occupancy mesh: every filled voxel gets faces against empty neighbors. Direct scan → STL. */
export function voxelSurface(verts: number[], voxel = 0.9, cap = 40): number[] {
  if (verts.length < 9) return verts;
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
  const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 8);
  const vox = Math.max(voxel, span / cap);
  const inv = 1 / vox;
  const occ = new Set<string>();
  for (let i = 0; i < verts.length; i += 3) {
    const ix = Math.round(verts[i] * inv);
    const iy = Math.round(verts[i + 1] * inv);
    const iz = Math.round(verts[i + 2] * inv);
    occ.add(`${ix}|${iy}|${iz}`);
  }
  const faces: number[] = [];
  const n = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ] as const;
  const quads = [
    [
      [0.5, -0.5, -0.5],
      [0.5, 0.5, -0.5],
      [0.5, 0.5, 0.5],
      [0.5, -0.5, 0.5],
    ],
    [
      [-0.5, -0.5, 0.5],
      [-0.5, 0.5, 0.5],
      [-0.5, 0.5, -0.5],
      [-0.5, -0.5, -0.5],
    ],
    [
      [-0.5, 0.5, -0.5],
      [-0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5],
      [0.5, 0.5, -0.5],
    ],
    [
      [-0.5, -0.5, 0.5],
      [-0.5, -0.5, -0.5],
      [0.5, -0.5, -0.5],
      [0.5, -0.5, 0.5],
    ],
    [
      [-0.5, -0.5, 0.5],
      [0.5, -0.5, 0.5],
      [0.5, 0.5, 0.5],
      [-0.5, 0.5, 0.5],
    ],
    [
      [0.5, -0.5, -0.5],
      [-0.5, -0.5, -0.5],
      [-0.5, 0.5, -0.5],
      [0.5, 0.5, -0.5],
    ],
  ];
  for (const key of occ) {
    const [sx, sy, sz] = key.split("|").map(Number);
    for (let f = 0; f < 6; f++) {
      const [dx, dy, dz] = n[f];
      if (occ.has(`${sx + dx}|${sy + dy}|${sz + dz}`)) continue;
      const q = quads[f];
      const p = q.map(([u, v, w]) => [(sx + u) * vox, (sy + v) * vox, (sz + w) * vox] as [number, number, number]);
      faces.push(...p[0], ...p[1], ...p[2], ...p[0], ...p[2], ...p[3]);
    }
  }
  return faces;
}

export function asciiStl(verts: number[], name = "pxd2"): string {
  const lines = [`solid ${name.replace(/\s+/g, "_")}`];
  for (let i = 0; i + 8 < verts.length; i += 9) {
    const ax = verts[i],
      ay = verts[i + 1],
      az = verts[i + 2];
    const bx = verts[i + 3],
      by = verts[i + 4],
      bz = verts[i + 5];
    const cx = verts[i + 6],
      cy = verts[i + 7],
      cz = verts[i + 8];
    const ux = bx - ax,
      uy = by - ay,
      uz = bz - az;
    const vx = cx - ax,
      vy = cy - ay,
      vz = cz - az;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    lines.push(`  facet normal ${nx} ${ny} ${nz}`);
    lines.push("    outer loop");
    lines.push(`      vertex ${ax} ${ay} ${az}`);
    lines.push(`      vertex ${bx} ${by} ${bz}`);
    lines.push(`      vertex ${cx} ${cy} ${cz}`);
    lines.push("    endloop");
    lines.push("  endfacet");
  }
  lines.push(`endsolid ${name.replace(/\s+/g, "_")}`);
  return lines.join("\n");
}

export function downloadText(filename: string, text: string, mime = "model/stl") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
