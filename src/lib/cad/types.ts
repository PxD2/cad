import type { SolidSpec } from "./solid-spec";

export type Hole = { x: number; y: number; d: number };

export type PegSpec = {
  x: number;
  y: number;
  d: number;
  length: number;
  kind: "peg" | "socket";
};

export type Tile = {
  name: string;
  origin: [number, number, number];
  size: [number, number, number];
  pegs: PegSpec[];
  sockets: PegSpec[];
};

export type Part = {
  name: string;
  width: number;
  height: number;
  thick: number;
  holes: Hole[];
  tiles: Tile[] | null;
  ask: string;
  notes: string[];
  solid?: SolidSpec | null;
  mesh?: number[] | null;
};

export type FitReport = {
  printer: string;
  bed: [number, number, number];
  usable: [number, number, number];
  part: [number, number, number];
  fits: boolean;
  overflow: Partial<Record<"x" | "y" | "z", number>>;
  scaleToFit: number;
};

export type LogEntry = { t: number; text: string };

export type Revision = {
  id: string;
  note: string;
  when: number;
  part: Part;
  action: string;
};

export type ScadPost = {
  id: string;
  name: string;
  scad: string;
  when: number;
};

export const DEFAULT_SCAD = `// 80 × 60 × 6 mm plate — M6 clearance, 50 × 30 pattern
w = 80;
h = 60;
t = 6;
difference() {
  cube([w, h, t], center = true);
  translate([-25, -15, 0]) cylinder(h = t + 2, d = 6.6, center = true);
  translate([ 25, -15, 0]) cylinder(h = t + 2, d = 6.6, center = true);
  translate([ 25,  15, 0]) cylinder(h = t + 2, d = 6.6, center = true);
  translate([-25,  15, 0]) cylinder(h = t + 2, d = 6.6, center = true);
}
`;

export function defaultPart(): Part {
  return {
    name: "plate",
    width: 80,
    height: 60,
    thick: 6,
    holes: [
      { x: -25, y: -15, d: 6.6 },
      { x: 25, y: -15, d: 6.6 },
      { x: 25, y: 15, d: 6.6 },
      { x: -25, y: 15, d: 6.6 },
    ],
    tiles: null,
    ask: "M6 plate with 4 holes, 6 mm thick",
    notes: ["Default shop plate"],
    solid: null,
  };
}
