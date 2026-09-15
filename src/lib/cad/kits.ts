import { makeInst, type Inst } from "./assembly.ts";
import { makeBelt, type BeltLoop } from "./belt.ts";
import { libById, partFromLib } from "./library.ts";

export type Kit = {
  id: string;
  name: string;
  hint: string;
  group: "Belts" | "Drive" | "Frames" | "Motion";
  build: () => { instances: Inst[]; belts: BeltLoop[] };
};

function must(id: string) {
  const item = libById(id);
  if (!item) throw new Error(`kit missing ${id}`);
  return partFromLib(item);
}

function easyGt2() {
  const nema = makeInst(must("nema-17"), -55, 0, 0);
  const motor = makeInst(must("gt2-20-b5"), -55, nema.part.thick, 0);
  const driven = makeInst(must("gt2-40-b5"), 55, 0, 0);
  const belt = makeBelt([motor.id, driven.id], "gt2", 6);
  return { instances: [nema, motor, driven], belts: [belt] };
}

function gt2Idler() {
  const a = makeInst(must("gt2-20-b5"), -50, 0, 0);
  const b = makeInst(must("gt2-40-b8"), 55, 0, 0);
  const idler = makeInst(must("gt2-idler-20"), 8, 0, 42);
  const belt = makeBelt([a.id, b.id, idler.id], "gt2", 6);
  return { instances: [a, b, idler], belts: [belt] };
}

function htdDrive() {
  const a = makeInst(must("htd5-12"), -48, 0, 0);
  const b = makeInst(must("htd5-24"), 60, 0, 0);
  const belt = makeBelt([a.id, b.id], "htd5", 15);
  return { instances: [a, b], belts: [belt] };
}

function skate() {
  const brg = makeInst(must("brg-608"), 0, 0, 0);
  const shaft = makeInst(must("shaft-8-80"), 0, 0, 0);
  const wheel = makeInst(must("wheel-80"), 0, 7, 0);
  return { instances: [shaft, brg, wheel], belts: [] as BeltLoop[] };
}

function nemaPulley() {
  const nema = makeInst(must("nema-17"), 0, 0, 0);
  const pulley = makeInst(must("gt2-20-b5"), 0, nema.part.thick, 0);
  const shaft = makeInst(must("shaft-5-40"), 0, 0, 0);
  return { instances: [nema, shaft, pulley], belts: [] as BeltLoop[] };
}

function compoundBox() {
  const base = makeInst(
    {
      name: "gearbox-plate",
      width: 90,
      height: 70,
      thick: 6,
      holes: [
        { x: -25, y: -15, d: 5.5 },
        { x: 25, y: -15, d: 5.5 },
        { x: 25, y: 15, d: 5.5 },
        { x: -25, y: 15, d: 5.5 },
      ],
      tiles: null,
      ask: "gearbox plate",
      notes: ["kit"],
      solid: { kind: "plate", width: 90, height: 70, t: 6 },
    },
    0,
    0,
    0,
  );
  const gear = makeInst(must("comp-20-60"), 0, 6, 0);
  const brg = makeInst(must("brg-608"), 0, 22, 0);
  return { instances: [base, gear, brg], belts: [] as BeltLoop[] };
}

function tslotCorner() {
  const a = makeInst(must("tslot-20-80"), 0, 0, 0);
  const b = makeInst(must("tslot-20-80"), 40, 0, 0, 90);
  const br = makeInst(must("lbr-20"), 20, 0, 0);
  return { instances: [a, b, br], belts: [] as BeltLoop[] };
}

export const KITS: Kit[] = [
  { id: "gt2-drive", name: "Easy GT2 belt", hint: "NEMA 17 · 20T · 40T · closed belt", group: "Belts", build: easyGt2 },
  { id: "gt2-idler", name: "GT2 + idler", hint: "three-wheel wrap", group: "Belts", build: gt2Idler },
  { id: "htd-drive", name: "HTD 5M drive", hint: "12T · 24T · 5 mm pitch", group: "Belts", build: htdDrive },
  { id: "nema-pulley", name: "NEMA 17 drive", hint: "face · shaft · 20T", group: "Drive", build: nemaPulley },
  { id: "skate", name: "608 skate", hint: "bearing · shaft · wheel", group: "Motion", build: skate },
  { id: "compound-box", name: "Compound gearbox", hint: "plate · 20/60 · 608", group: "Drive", build: compoundBox },
  { id: "tslot-corner", name: "2020 corner", hint: "extrusion · L-bracket", group: "Frames", build: tslotCorner },
];

export function kitById(id: string) {
  return KITS.find((k) => k.id === id) ?? null;
}
