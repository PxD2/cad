import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LIBRARY, libById, libMatch, partFromLib } from "./library.ts";
import { envelopeOf, parseBeniPragma } from "./solid-spec.ts";
import { parseCommand } from "./commands.ts";
import { nudgeTeeth, makeCompound } from "./tweak.ts";
import { defaultPart } from "./types.ts";
import { alignPlies, cleanCloud, occupancy, voxelDownsample } from "./scan.ts";
import { demoDualScan } from "./scan-synth.ts";

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
    assert.ok(libMatch("608"));
    assert.ok(LIBRARY.some((x) => x.group === "Belts"));
    assert.ok(LIBRARY.some((x) => x.group === "Drive"));
    assert.ok(LIBRARY.some((x) => x.group === "Electronics"));
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
});

describe("voice shop", () => {
  it("parses teeth and compound", () => {
    assert.deepEqual(parseCommand("increase teeth"), { t: "teeth", delta: 2 });
    assert.deepEqual(parseCommand("reduce teeth by 4"), { t: "teeth", delta: -4 });
    assert.deepEqual(parseCommand("set teeth to 30"), { t: "teeth", set: 30 });
    assert.equal(parseCommand("compound with 60").t, "compound");
    assert.equal(parseCommand("make it herringbone").t, "kind");
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
