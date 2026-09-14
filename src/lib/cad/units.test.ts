import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fromDisplay, inferUnit, lengthToMm, parseAskLengths, toDisplay, toMm } from "./units.ts";

describe("units", () => {
  it("converts inches and cm to mm", () => {
    assert.equal(toMm(1, "in"), 25.4);
    assert.equal(toMm(1, "cm"), 10);
    assert.equal(toDisplay(25.4, "in"), 1);
  });

  it("parses mixed fractions and quotes", () => {
    assert.equal(lengthToMm("1/4", "in", "mm"), 6.35);
    assert.equal(lengthToMm("1-1/2", '"', "mm"), 38.1);
    assert.equal(lengthToMm("80", "mm", "in"), 80);
    assert.equal(lengthToMm("1/4", undefined, "mm"), 6.35);
  });

  it("does not drift when converting a displayed value back", () => {
    const mm = 80;
    const shown = Number(toDisplay(mm, "in").toFixed(3));
    assert.equal(fromDisplay(shown, "in", mm), 80);
    assert.equal(fromDisplay(4, "in", mm), 101.6);
  });

  it("infers a sentence unit", () => {
    assert.equal(inferUnit('4x3 plate 1/4" thick', "mm"), "in");
    assert.equal(inferUnit("80x60 plate 6 mm thick", "in"), "mm");
    assert.equal(inferUnit("8x6 plate 0.6 cm thick", "mm"), "cm");
    assert.equal(inferUnit("4x3 plate 0.25 thick", "in"), "in");
  });
});

describe("parseAskLengths", () => {
  it("keeps metric asks in mm", () => {
    const a = parseAskLengths("80x60 plate 6mm thick with 4 M6 holes");
    assert.equal(a.width, 80);
    assert.equal(a.height, 60);
    assert.equal(a.thickness, 6);
  });

  it("converts explicit inches to mm", () => {
    const a = parseAskLengths('4x3 plate 1/4" thick with 4 holes');
    assert.equal(a.width, 101.6);
    assert.equal(a.height, 76.2);
    assert.equal(a.thickness, 6.35);
  });

  it("uses the display unit for bare numbers", () => {
    const a = parseAskLengths("4x3 plate 0.25 thick", "in");
    assert.equal(a.width, 101.6);
    assert.equal(a.height, 76.2);
    assert.equal(a.thickness, 6.35);
  });

  it("parses inch hole diameters", () => {
    const a = parseAskLengths("holes are 1/4 inch");
    assert.equal(a.holeDiameter, 6.35);
  });

  it("does not treat a pattern as the plate size", () => {
    const a = parseAskLengths("80x60 plate with 50x30 mm pattern");
    assert.equal(a.width, 80);
    assert.equal(a.height, 60);
    assert.deepEqual(a.pattern, [50, 30]);
  });

  it("does not treat hole count as a diameter", () => {
    const a = parseAskLengths("80x60 plate 6mm thick with 4 M6 holes");
    assert.equal(a.holeDiameter, null);
  });
});
