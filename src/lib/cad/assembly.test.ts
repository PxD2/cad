import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bedHeights, flippedSize, hitStackY, instBox, liftY, lowerIn, makeInst, raiseIn, restackY, sitOffsetY, snapTo } from "./assembly.ts";
import { defaultPart } from "./types.ts";
import { parseCommand } from "./commands.ts";

describe("assembly stack", () => {
  it("snaps to the peg grid", () => {
    assert.equal(snapTo(23, 20), 20);
    assert.equal(snapTo(12, 5), 10);
  });

  it("restacks layers along Y like paint", () => {
    const a = makeInst(defaultPart(), 0, 9, 0);
    const b = makeInst({ ...defaultPart(), thick: 8, name: "gear" }, 0, 0, 0);
    const stacked = restackY([a, b]);
    assert.equal(stacked[0].y, 0);
    assert.equal(stacked[1].y, 6);
  });

  it("stacks the next brush on the hit column", () => {
    const plate = makeInst(defaultPart(), 0, 0, 0);
    assert.equal(hitStackY([plate], 0, 0), 6);
    assert.equal(hitStackY([plate], 400, 400), 0);
  });

  it("raise / lower swap layer order then restack", () => {
    const a = makeInst({ ...defaultPart(), name: "a", thick: 6 }, 0, 0, 0);
    const b = makeInst({ ...defaultPart(), name: "b", thick: 8 }, 0, 0, 0);
    const up = raiseIn([a, b], a.id);
    assert.equal(up[1].name, "a");
    assert.equal(up[1].y, 8);
    const down = lowerIn(up, a.id);
    assert.equal(down[0].name, "a");
    assert.equal(down[0].y, 0);
  });

  it("wheel lift stays off the bed and magnets onto a vertical bed", () => {
    assert.equal(liftY(-4, 5, [0]), 0);
    assert.equal(liftY(5, 5, [0]), 5);
    const plate = makeInst({ ...defaultPart(), thick: 6, name: "plate" }, 0, 0, 0);
    const beds = bedHeights([plate], "other");
    assert.ok(beds.includes(6));
    assert.equal(liftY(5.2, 1, beds), 6);
  });

  it("flip tumbles the solid and side/vert boxes follow", () => {
    const p = { ...defaultPart(), width: 80, height: 60, thick: 6 };
    assert.equal(sitOffsetY(p, 0), 0);
    assert.equal(sitOffsetY(p, 90), 30);
    assert.equal(sitOffsetY(p, 180), 6);
    assert.equal(flippedSize(p, 90).h, 60);
    const it = makeInst(p, 10, 0, -4, 0, 0);
    const side = instBox(it);
    assert.equal(side.spanX, 80);
    assert.equal(side.spanZ, 60);
    assert.equal(side.spanY, 6);
    const flipped = { ...it, flip: 90 };
    const vert = instBox(flipped);
    assert.equal(vert.spanY, 60);
  });
});

describe("paint voice", () => {
  it("parses stamp stack raise", () => {
    assert.equal(parseCommand("stamp").t, "paint");
    assert.equal(parseCommand("stack it").t, "paint");
    assert.equal(parseCommand("demo stack").t, "paint");
    assert.equal(parseCommand("move tool").t, "tool");
    assert.equal(parseCommand("snap to peg 20").t, "snap");
    assert.equal(parseCommand("flip").t, "paint");
    assert.equal(parseCommand("rotate 90").t, "paint");
  });
});
