import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCommand } from "./commands.ts";
import { libById } from "./library.ts";
import { asciiStl, REVO_DEVICES, voxelSurface } from "./revo.ts";
import { envelopeOf } from "./solid-spec.ts";
import { geometryForSolid } from "./solids.ts";
import { parseThingRef, partFromThing, searchThings, THINGIVERSE, twinForQuery } from "./thingiverse.ts";
import { snapTo } from "./assembly.ts";

describe("thingiverse", () => {
  it("indexes unique open-hardware classics with real twins", () => {
    const ids = THINGIVERSE.map((h) => h.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(THINGIVERSE.length >= 40);
    for (const h of THINGIVERSE) {
      assert.ok(h.twin, h.name);
      assert.ok(libById(h.twin), `missing twin ${h.twin} for ${h.name}`);
      const p = partFromThing(h);
      assert.ok(p.solid?.kind, `no solid for ${h.name}`);
      assert.notEqual(p.solid?.kind, "plate", `${h.name} fell back to a plate`);
    }
  });

  it("NEMA, cube, hook, gopro, benchy, collar are the right solids", () => {
    const nema = partFromThing(searchThings("thing:30140")[0]);
    assert.equal(nema.solid?.kind, "nema");
    assert.ok(Math.abs(nema.width - 42.3) < 0.2);
    const cube = partFromThing(searchThings("thing:9096")[0]);
    assert.equal(cube.solid?.kind, "cube");
    assert.equal(cube.width, 20);
    const xyz = partFromThing(searchThings("xyz cal")[0]);
    assert.equal(xyz.solid?.kind, "xyzcube");
    const hook = partFromThing(searchThings("coat hook")[0]);
    assert.equal(hook.solid?.kind, "hook");
    const head = partFromThing(searchThings("headphone hook")[0]);
    assert.equal(head.solid?.kind, "headhook");
    const gopro = partFromThing(searchThings("gopro")[0]);
    assert.equal(gopro.solid?.kind, "gopro");
    const benchy = partFromThing(searchThings("benchy")[0]);
    assert.equal(benchy.solid?.kind, "hull");
    const collar = partFromThing(searchThings("shaft collar")[0]);
    assert.equal(collar.solid?.kind, "collar");
    const cam = partFromThing(searchThings("pi camera mount")[0]);
    assert.equal(cam.solid?.kind, "picam");
    const arm = partFromThing(searchThings("pi cam arm")[0]);
    assert.equal(arm.solid?.kind, "arm");
    const env = envelopeOf({ kind: "bin", width: 42, height: 42, t: 21 });
    assert.equal(env.width, 42);
  });

  it("does not reuse lookalike twins across different objects", () => {
    assert.notEqual(searchThings("coat hook")[0]?.twin, searchThings("headphone hook")[0]?.twin);
    assert.notEqual(searchThings("gopro")[0]?.twin, searchThings("nema 17")[0]?.twin);
    assert.notEqual(searchThings("drawer knob")[0]?.twin, searchThings("knurled knob")[0]?.twin);
    assert.notEqual(searchThings("gt2 belt clip")[0]?.twin, searchThings("cable clip")[0]?.twin);
    assert.notEqual(searchThings("gt2 idler")[0]?.twin, searchThings("gt2 timing pulley 20")[0]?.twin);
    assert.notEqual(searchThings("gridfinity bin 2")[0]?.twin, searchThings("gridfinity bin 1")[0]?.twin);
    assert.notEqual(searchThings("flexible coupling")[0]?.twin, searchThings("parametric coupling")[0]?.twin);
  });

  it("finds a gear by thing id", () => {
    assert.equal(parseThingRef("https://www.thingiverse.com/thing:16627"), 16627);
    assert.equal(searchThings("thing:16627")[0]?.twin, "spur-m2-20");
  });

  it("maps a loose query onto a real PXD2 solid", () => {
    assert.equal(twinForQuery("nema 17"), "nema-17");
    const p = partFromThing({
      id: "gh-1",
      thingId: null,
      name: "some/gopro-mount",
      maker: "github",
      license: "see repo",
      tags: "Mounts",
      url: "",
      twin: "",
      source: "github",
      hint: "",
    });
    assert.equal(p.solid?.kind, "gopro");
  });

  it("builds geometry for the dedicated shop solids", () => {
    for (const kind of ["gopro", "picam", "arm", "collar", "xyzcube", "headhook", "spool", "hull", "nema"] as const) {
      const geo = geometryForSolid({ kind, size: 17, a: 20 });
      const pos = geo.getAttribute("position");
      assert.ok(pos && pos.count > 8, kind);
    }
  });
});

describe("revo stl", () => {
  it("turns a cloud into a closed voxel mesh", () => {
    const verts: number[] = [];
    for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) for (let z = 0; z < 8; z++) verts.push(x, y, z);
    const tri = voxelSurface(verts, 1, 16);
    assert.ok(tri.length >= 36);
    assert.equal(tri.length % 9, 0);
    const stl = asciiStl(tri, "pxd2");
    assert.match(stl, /solid pxd2/);
    assert.match(stl, /facet normal/);
  });

  it("lists Generic first as the direct STL path", () => {
    assert.equal(REVO_DEVICES[0].id, "generic");
  });
});

describe("thingiverse voice", () => {
  it("opens the premade tray and stamps a named thing", () => {
    const open = parseCommand("thingiverse for pulley");
    assert.equal(open.t, "things");
    const stamp = parseCommand("stamp benchy");
    assert.equal(stamp.t, "stamp-thing");
  });
});

describe("move snap", () => {
  it("free snap leaves the value alone", () => {
    assert.equal(snapTo(13.4, 0), 13.4);
    assert.equal(snapTo(13.4, 5), 15);
  });
});
