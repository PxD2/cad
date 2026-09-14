import { usable } from "./printer";
import type { Part, PegSpec, Tile } from "./types";

export const PEG_PITCH = 20;
export const PEG_D = 8;
export const PEG_LEN = 10;

function row(length: number, pitch = PEG_PITCH): number[] {
  const n = Math.max(1, Math.floor((length - pitch) / pitch) + 1);
  if (n <= 1) return [0];
  const span = (n - 1) * pitch;
  const start = -span / 2;
  return Array.from({ length: n }, (_, i) => start + i * pitch);
}

export function splitPlate(part: Part): Tile[] {
  const u = usable();
  const nx = part.width <= u.x ? 1 : Math.ceil(part.width / u.x);
  const ny = part.height <= u.y ? 1 : Math.ceil(part.height / u.y);
  const tileW = part.width / nx;
  const tileH = part.height / ny;
  const holeD = PEG_D + 0.4;
  const tiles: Tile[] = [];
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const ox = -part.width / 2 + tileW * (ix + 0.5);
      const oy = -part.height / 2 + tileH * (iy + 0.5);
      const pegs: PegSpec[] = [];
      const sockets: PegSpec[] = [];
      if (ix < nx - 1) {
        for (const y of row(tileH)) pegs.push({ x: tileW / 2, y, d: PEG_D, length: PEG_LEN, kind: "peg" });
      }
      if (ix > 0) {
        for (const y of row(tileH))
          sockets.push({ x: -tileW / 2, y, d: holeD, length: PEG_LEN, kind: "socket" });
      }
      if (iy < ny - 1) {
        for (const x of row(tileW)) pegs.push({ x, y: tileH / 2, d: PEG_D, length: PEG_LEN, kind: "peg" });
      }
      if (iy > 0) {
        for (const x of row(tileW))
          sockets.push({ x, y: -tileH / 2, d: holeD, length: PEG_LEN, kind: "socket" });
      }
      tiles.push({
        name: `tile_${ix}_${iy}`,
        origin: [ox, oy, 0],
        size: [tileW, tileH, part.thick],
        pegs,
        sockets,
      });
    }
  }
  return tiles;
}

export function applyPegSplit(part: Part): Part {
  const tiles = splitPlate(part);
  if (tiles.length <= 1) return { ...part, tiles: null };
  return {
    ...part,
    tiles,
    notes: [...part.notes, `peg-split ${tiles.length} tiles for K2 Plus`],
  };
}
