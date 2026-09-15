import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeInst } from "./assembly.ts";
import {
  alignToLasers,
  brushInst,
  holeHits,
  holeWorld,
  holesOf,
  laserLocks,
  lockAxes,
  snapToLasers,
} from "./laser.ts";
import { defaultPart } from "./types.ts";
import { parseCommand } from "./commands.ts";

describe("laser level", () => {
  it("fires through the default plate holes in world space", () => {
    const it = makeInst(defaultPart(), 0, 0, 0);
    const h = holeWorld(it, it.part.holes[0]);
    assert.equal(it.part.holes[0].x, -25);
    assert.equal(it.part.holes[0].y, -15);
    assert.equal(h.x, -25);
    assert.equal(h.z, 15);
    assert.equal(h.y, 6);
  });

  it("yaw 90 turns a hole around the bed", () => {
    const it = makeInst(defaultPart(), 0, 0, 0, 90, 0);
    const h = holeWorld(it, { x: -25, y: -15, d: 6.6 });
    assert.ok(Math.abs(h.x - 15) < 1e-9);
    assert.ok(Math.abs(h.z - 25) < 1e-9);
  });

  it("two plates on the same XY lock X Z and the hole lasers coincide", () => {
    const a = makeInst(defaultPart(), 0, 0, 0);
    const b = makeInst(defaultPart(), 0, 6, 0);
    const locks = laserLocks(holeHits([a, b]));
    const axes = lockAxes(locks);
    assert.ok(axes.includes("x"));
    assert.ok(axes.includes("z"));
    assert.ok(locks.length >= 4);
  });

  it("snap-to-laser magnets a near miss onto the other plate's holes", () => {
    const a = makeInst(defaultPart(), 0, 0, 0);
    const b = makeInst(defaultPart(), 2, 0, 0);
    const hit = snapToLasers(b, [a], 2, 0, 5);
    assert.equal(hit.x, 0);
    assert.equal(hit.z, 0);
  });

  it("align holes slides a drifted plate onto the laser", () => {
    const a = makeInst(defaultPart(), 0, 0, 0);
    const b = makeInst(defaultPart(), 18, 0, 7);
    const hit = alignToLasers(b, [a]);
    assert.equal(hit.x, 0);
    assert.equal(hit.z, 0);
  });

  it("NEMA face gets the 31 mm bolt pattern on the laser", () => {
    const holes = holesOf({
      ...defaultPart(),
      holes: [],
      solid: { kind: "nema", size: 17, t: 5 },
      width: 42.3,
      height: 42.3,
      thick: 5,
    });
    assert.equal(holes.length, 5);
    assert.ok(holes.some((h) => Math.abs(h.x - 15.5) < 0.01 && Math.abs(h.y - 15.5) < 0.01));
  });

  it("Vevor can lasers the shaft and the 4-bolt foot", () => {
    const holes = holesOf({
      ...defaultPart(),
      holes: [],
      solid: { kind: "motor", size: 5, od: 107, length: 135, bore: 12, t: 25, a: 56, b: 102, teeth: 11, pitch: 8 },
      width: 107,
      height: 171,
      thick: 160,
    });
    assert.ok(holes.length >= 5);
    assert.ok(holes.some((h) => h.d === 12 && h.x === 0));
  });

  it("brush ghost still exposes the four plate lasers", () => {
    const hits = holeHits([brushInst(defaultPart())]);
    assert.equal(hits.length, 4);
  });
});

describe("laser voice", () => {
  it("parses laser level and align holes", () => {
    assert.equal(parseCommand("laser").t, "laser");
    assert.equal(parseCommand("laser off").t, "laser");
    assert.equal(parseCommand("align holes").t, "laser-align");
    assert.equal(parseCommand("laser level").t, "laser");
  });
});
