import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeInst } from "./assembly.ts";
import {
  beltCaption,
  defaultBeltPair,
  inferProfile,
  isPulleyLike,
  makeBelt,
  openBeltLength,
  pitchRadius,
  snapTeeth,
  twoPulleyPath,
  wrapBelt,
  wrapCircles,
} from "./belt.ts";
import { partFromLib, libById } from "./library.ts";
import { parseCommand } from "./commands.ts";

describe("belt math", () => {
  it("open belt length for equal pulleys is 2C + 2πr", () => {
    const L = openBeltLength(100, 10, 10);
    assert.ok(Math.abs(L - (200 + 2 * Math.PI * 10)) < 0.05);
  });

  it("snaps GT2 length onto whole teeth", () => {
    assert.equal(snapTeeth(262.8, 2), 131);
    assert.equal(snapTeeth(200, 2), 100);
  });

  it("two equal pulleys wrap with two outer arcs", () => {
    const a = { x: 0, y: 4, z: 0, r: 10 };
    const b = { x: 100, y: 4, z: 0, r: 10 };
    const pts = twoPulleyPath(a, b);
    assert.ok(pts.length > 20);
    const wrap = wrapCircles([a, b]);
    assert.equal(wrap.ok, true);
    assert.ok(Math.abs(wrap.length - openBeltLength(100, 10, 10)) < 0.2);
  });

  it("refuses overlapping pulleys", () => {
    const wrap = wrapCircles(
      [
        { x: 0, y: 0, z: 0, r: 10 },
        { x: 4, y: 0, z: 0, r: 10 },
      ],
    );
    assert.equal(wrap.ok, false);
  });

  it("wraps three pulleys as a closed loop", () => {
    const wrap = wrapCircles([
      { x: 0, y: 4, z: 0, r: 8 },
      { x: 80, y: 4, z: 0, r: 12 },
      { x: 40, y: 4, z: 40, r: 6 },
    ]);
    assert.equal(wrap.ok, true);
    assert.ok(wrap.points.length > 30);
    assert.ok(wrap.length > 200);
  });
});

describe("belt on the tray", () => {
  it("GT2 pulleys are pulley-like and pitch radius is z·p / 2π", () => {
    const item = libById("gt2-20-b5");
    assert.ok(item);
    const part = partFromLib(item);
    assert.equal(isPulleyLike(part), true);
    const r = pitchRadius(part);
    assert.ok(Math.abs(r - (20 * 2) / (2 * Math.PI)) < 0.05);
  });

  it("belts two stamped GT2 pulleys and reports teeth", () => {
    const a = makeInst(partFromLib(libById("gt2-20-b5")!), -50, 0, 0);
    const b = makeInst(partFromLib(libById("gt2-40-b5")!), 50, 0, 0);
    const belt = makeBelt([a.id, b.id], inferProfile([a.part, b.part]));
    assert.equal(belt.profile, "gt2");
    const path = wrapBelt([a, b], belt);
    assert.equal(path.ok, true);
    assert.ok(path.teeth >= 100);
    assert.match(beltCaption(path), /GT2/);
    assert.match(beltCaption(path), /T ·/);
  });

  it("picks the last two pulleys when none are named", () => {
    const a = makeInst(partFromLib(libById("gt2-16-b5")!), 0, 0, 0);
    const b = makeInst(partFromLib(libById("gt2-24-b5")!), 80, 0, 0);
    const pair = defaultBeltPair([a, b], null, null);
    assert.deepEqual(pair, [a.id, b.id]);
  });
});

describe("belt voice", () => {
  it("parses easy belt and belt them", () => {
    assert.equal(parseCommand("easy belt").t, "easy-belt");
    assert.equal(parseCommand("belt drive").t, "easy-belt");
    assert.equal(parseCommand("belt them").t, "belt-pair");
    assert.equal(parseCommand("gt2 belt").t, "belt-pair");
    const tool = parseCommand("belt tool");
    assert.equal(tool.t, "tool");
    if (tool.t === "tool") assert.equal(tool.tool, "belt");
  });
});
