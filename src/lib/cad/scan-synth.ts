import { newPlyId, type ScanPly } from "./scan.ts";

/** Two overlapping noisy partial plates — a typical dual-angle POP4 pair. */
export function demoDualScan(): ScanPly[] {
  const a = partialPlate(-18, 0.4, 0, 0x9aa7b4, "scan-A left");
  const b = partialPlate(16, -0.2, 9, 0xc4a574, "scan-B right");
  return [a, b];
}

function partialPlate(shiftX: number, shiftZ: number, yaw: number, color: number, name: string): ScanPly {
  const verts: number[] = [];
  const w = 80,
    h = 6,
    d = 60;
  const holes = [
    [-25, -15],
    [25, -15],
    [25, 15],
    [-25, 15],
  ];
  const keep = (x: number) => (shiftX < 0 ? x < 22 : x > -22);
  for (let ix = 0; ix <= 48; ix++) {
    for (let iz = 0; iz <= 36; iz++) {
      const x = -w / 2 + (ix / 48) * w;
      const z = -d / 2 + (iz / 36) * d;
      if (!keep(x)) continue;
      if (Math.hypot(x - shiftX * 0.2, z) > 58 && Math.random() < 0.35) continue;
      const y = h / 2 + (Math.random() - 0.5) * 0.55;
      if (holes.some(([hx, hz]) => Math.hypot(x - hx, z - hz) < 3.4)) continue;
      if (Math.random() < 0.08) {
        verts.push(x + (Math.random() - 0.5) * 6, y + Math.random() * 4, z + (Math.random() - 0.5) * 6);
      }
      verts.push(x + (Math.random() - 0.5) * 0.25, y, z + (Math.random() - 0.5) * 0.25);
    }
  }
  for (let ix = 0; ix <= 48; ix++) {
    for (let iy = 0; iy <= 8; iy++) {
      const x = -w / 2 + (ix / 48) * w;
      const y = -h / 2 + (iy / 8) * h;
      if (!keep(x)) continue;
      verts.push(x, y + (Math.random() - 0.5) * 0.2, -d / 2 + (Math.random() - 0.5) * 0.2);
      verts.push(x, y + (Math.random() - 0.5) * 0.2, d / 2 + (Math.random() - 0.5) * 0.2);
    }
  }
  return {
    id: newPlyId(),
    name,
    verts,
    offset: [shiftX, 0, shiftZ],
    rotZ: yaw,
    visible: true,
    color,
  };
}
