import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LIBRARY, libById, libMatch, partFromLib } from "./library.ts";
import { envelopeOf, parseBeniPragma } from "./solid-spec.ts";
import { parseCommand } from "./commands.ts";
import { nudgeTeeth, makeCompound } from "./tweak.ts";
import { defaultPart } from "./types.ts";
import { alignPlies, cleanCloud, occupancy, voxelDownsample } from "./scan.ts";
import { demoDualScan } from "./scan-synth.ts";
import { kitById } from "./kits.ts";

describe("library", () => {
  it("ships a large unique catalog", () => {
    const ids = LIBRARY.map((x) => x.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(LIBRARY.length >= 200, `got ${LIBRARY.length}`);
    assert.ok(LIBRARY.some((x) => x.group === "Gears" && x.solid.kind === "spur"));
    assert.ok(LIBRARY.some((x) => x.solid.kind === "compound"));
    assert.ok(libById("nema-17"));
    assert.ok(libById("gopro"));
    assert.ok(libById("cube-xyz"));
    assert.ok(libById("collar-8"));
    assert.ok(libById("gt2-20-b5"));
    assert.ok(libById("gt2-loop-200"));
    assert.ok(libById("shaft-8-80"));
    assert.ok(libById("servo-sg90"));
    assert.ok(libById("helical-20"));
    assert.ok(libById("vevor-48-3000"));
    assert.ok(libById("motor-2207"));
    assert.ok(libById("motor-0603"));
    assert.ok(libById("motor-1103"));
    assert.ok(libById("stepper-17-40"));
    assert.ok(libById("hub-10-3000"));
    assert.ok(libMatch("608"));
    assert.ok(libMatch("vevor 3000"));
    assert.ok(libMatch("vevor 3000 watt 48 volt"));
    assert.equal(libMatch("vevor 3000")?.id, "vevor-48-3000");
    assert.equal(libMatch("smallest drone motor")?.id, "motor-0603");
    assert.equal(libMatch("2207")?.id, "motor-2207");
    assert.ok(LIBRARY.some((x) => x.group === "Belts"));
    assert.ok(LIBRARY.some((x) => x.group === "Drive"));
    assert.ok(LIBRARY.some((x) => x.group === "Electronics"));
    assert.ok(LIBRARY.filter((x) => x.group === "Motors").length >= 40);
  });

  it("drops a spur with a beni pragma", () => {
    const p = partFromLib(libById("spur-m2-20")!);
    assert.equal(p.solid?.kind, "spur");
    assert.ok(p.width > 40);
    const spec = parseBeniPragma(libById("spur-m2-20")!.scad);
    assert.equal(spec?.kind, "spur");
    assert.equal(spec?.teeth, 20);
  });

  it("computes a spur envelope from module and teeth", () => {
    const env = envelopeOf({ kind: "spur", teeth: 20, module: 2, t: 8 });
    assert.equal(env.width, 44);
  });

  it("Vevor 48V 3000W is a real MY1020D can", () => {
    const item = libById("vevor-48-3000")!;
    assert.equal(item.solid.kind, "motor");
    assert.equal(item.solid.size, 5);
    assert.equal(item.solid.od, 107);
    assert.equal(item.solid.length, 135);
    assert.equal(item.solid.bore, 12);
    const env = envelopeOf(item.solid);
    assert.ok(env.width >= 107);
    assert.ok(env.thick >= 150);
    const p = partFromLib(item);
    assert.ok(p.holes.length >= 4);
    assert.ok(p.holes.some((h) => h.d === 12));
  });

  it("drone 2207 is an outrunner with a 16 mm mount", () => {
    const item = libById("motor-2207")!;
    assert.equal(item.solid.kind, "motor");
    assert.equal(item.solid.size, 1);
    assert.ok(Math.abs((item.solid.od ?? 0) - 27.9) < 0.2);
    assert.equal(item.solid.a, 16);
    assert.equal(item.solid.bore, 4);
    const p = partFromLib(item);
    assert.ok(p.holes.length >= 5);
  });

  it("motor kits drop real cans on the tray", () => {
    const vevor = kitById("vevor-kart")!.build();
    assert.equal(vevor.instances[0].part.solid?.kind, "motor");
    assert.equal(vevor.instances[0].part.solid?.od, 107);
    const whoop = kitById("tiny-whoop")!.build();
    assert.equal(whoop.instances.length, 3);
    assert.equal(whoop.instances[0].part.solid?.kind, "motor");
    const d = kitById("drone-2207")!.build();
    assert.equal(d.instances[0].part.name, "motor-2207");
  });
});

describe("voice shop", () => {
  it("parses teeth and compound", () => {
    assert.deepEqual(parseCommand("increase teeth"), { t: "teeth", delta: 2 });
    assert.deepEqual(parseCommand("reduce teeth by 4"), { t: "teeth", delta: -4 });
    assert.deepEqual(parseCommand("set teeth to 30"), { t: "teeth", set: 30 });
    assert.equal(parseCommand("compound with 60").t, "compound");
    assert.deepEqual(parseCommand("make it herringbone"), { t: "kind", kind: "herringbone" });
    assert.equal(parseCommand("vevor 3000").t, "kit");
    assert.equal(parseCommand("smallest drone motor").t, "kit");
    const lib = parseCommand("2207");
    assert.equal(lib.t, "lib");
  });

  it("nudges teeth on a plate by turning it into a spur", () => {
    const hit = nudgeTeeth(defaultPart(), 4);
    assert.equal(hit.part.solid?.kind, "spur");
    assert.equal(hit.part.solid?.teeth, 24);
    const c = makeCompound(hit.part, 48);
    assert.equal(c.part.solid?.kind, "compound");
    assert.equal(c.part.solid?.teeth2, 48);
  });
});

describe("scan tray", () => {
  it("voxel-downsamples and cleans outliers", () => {
    const raw: number[] = [];
    for (let i = 0; i < 200; i++) raw.push(i * 0.2, 0, 0);
    raw.push(400, 80, 400);
    const v = voxelDownsample(raw, 1);
    assert.ok(v.length / 3 < raw.length / 3);
    const c = cleanCloud(raw, 1, 1.2, false);
    assert.ok(c.length / 3 <= raw.length / 3);
  });

  it("demo dual scan occupies a plate-sized bbox", () => {
    const plies = demoDualScan();
    assert.equal(plies.length, 2);
    const occ = occupancy(plies[0].verts);
    assert.ok(occ.n > 200);
    assert.ok(occ.empty < 0.95);
  });

  it("auto-aligns a shifted ply toward the reference", () => {
    const [a, b] = demoDualScan();
    const before = Math.hypot(b.offset[0], b.offset[2]);
    const aligned = alignPlies([a, b]);
    const after = Math.hypot(aligned[1].offset[0], aligned[1].offset[2]);
    assert.ok(after <= before + 2);
  });
});
