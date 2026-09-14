import { defaultPart, type Part } from "./types";

export type Preset = { id: string; label: string; hint: string; part: Part };

function plate(
  name: string,
  w: number,
  h: number,
  t: number,
  holes: Part["holes"],
  ask: string,
  notes: string[],
): Part {
  return { name, width: w, height: h, thick: t, holes, tiles: null, ask, notes };
}

export const PRESETS: Preset[] = [
  {
    id: "shop",
    label: "Shop plate",
    hint: "80 × 60 × 6 · 4× M6",
    part: defaultPart(),
  },
  {
    id: "m8",
    label: "M8 square",
    hint: "100 × 100 × 8 · 4× Ø9",
    part: plate(
      "m8-square",
      100,
      100,
      8,
      [
        { x: -35, y: -35, d: 9 },
        { x: 35, y: -35, d: 9 },
        { x: 35, y: 35, d: 9 },
        { x: -35, y: 35, d: 9 },
      ],
      "100x100 plate 8mm thick with 4 M8 holes",
      ["M8 normal = Ø9"],
    ),
  },
  {
    id: "lid",
    label: "Oversize lid",
    hint: "400 × 200 × 8 — needs pegs",
    part: plate(
      "k2-lid",
      400,
      200,
      8,
      [
        { x: -170, y: -70, d: 6.6 },
        { x: 170, y: -70, d: 6.6 },
        { x: 170, y: 70, d: 6.6 },
        { x: -170, y: 70, d: 6.6 },
      ],
      "400x200 lid 8mm thick with 4 M6 holes",
      ["Larger than K2 usable bed — peg-split"],
    ),
  },
  {
    id: "spacer",
    label: "M6 spacer",
    hint: "30 × 30 × 12 · 1 hole",
    part: plate(
      "spacer",
      30,
      30,
      12,
      [{ x: 0, y: 0, d: 6.6 }],
      "30x30 spacer 12mm thick with 1 M6 hole",
      ["M6 normal = Ø6.6"],
    ),
  },
];
