import type { Part } from "./types";
import { envelopeOf, scadPragma, type SolidKind, type SolidSpec } from "./solid-spec.ts";

export type LibItem = {
  id: string;
  name: string;
  group: "Gears" | "Compound" | "Motion" | "Hardware" | "Fasteners" | "Frames" | "Shop";
  source: string;
  hint: string;
  solid: SolidSpec;
  scad: string;
};

export const LIB_GROUPS: LibItem["group"][] = ["Gears", "Compound", "Motion", "Hardware", "Fasteners", "Frames", "Shop"];

function item(
  id: string,
  name: string,
  group: LibItem["group"],
  source: string,
  hint: string,
  solid: SolidSpec,
): LibItem {
  const env = envelopeOf(solid);
  const body = bodyFor(solid);
  return {
    id,
    name,
    group,
    source,
    hint,
    solid,
    scad: `${scadPragma(solid)}
// ${name} — ${env.width.toFixed(1)} × ${env.height.toFixed(1)} × ${env.thick.toFixed(1)} mm
// source: ${source}
${body}
`,
  };
}

function bodyFor(s: SolidSpec): string {
  if (s.kind === "spur" || s.kind === "herringbone" || s.kind === "bevel") {
    const z = s.teeth ?? 20;
    const m = s.module ?? 2;
    const bore = s.bore ?? 5;
    const t = s.t ?? 8;
    return `z = ${z}; m = ${m}; bore = ${bore}; t = ${t};
difference() {
  cylinder(h = t, d = z * m + 2 * m, center = true, $fn = z * 2);
  cylinder(h = t + 2, d = bore, center = true);
}`;
  }
  if (s.kind === "compound") {
    return `z1 = ${s.teeth ?? 20}; z2 = ${s.teeth2 ?? 40}; m = ${s.module ?? 2}; t = ${s.t ?? 16};
union() {
  translate([0, 0, -t / 4]) cylinder(h = t / 2, d = z1 * m + 2 * m, center = true);
  translate([0, 0, t / 4]) cylinder(h = t / 2, d = z2 * m + 2 * m, center = true);
}`;
  }
  return `// ${s.kind} envelope`;
}

function boreFor(m: number) {
  if (m <= 1) return 3;
  if (m <= 1.5) return 4;
  if (m <= 2) return 5;
  if (m <= 2.5) return 6;
  return 8;
}

function buildLibrary(): LibItem[] {
  const out: LibItem[] = [];
  const teeth = [8, 10, 12, 14, 16, 18, 20, 24, 30, 36, 40, 48, 60];
  const modules = [1, 1.5, 2, 2.5, 3];
  for (const m of modules) {
    for (const z of teeth) {
      if (m >= 3 && z > 40) continue;
      const t = m <= 1.5 ? 6 : m <= 2 ? 8 : 10;
      const b = boreFor(m);
      out.push(
        item(
          `spur-m${String(m).replace(".", "p")}-${z}`,
          `Spur ${z}T · M${m}`,
          "Gears",
          "MCAD involute (parametric)",
          `Ø${(z + 2) * m} · bore ${b}`,
          { kind: "spur", teeth: z, module: m, bore: b, t },
        ),
      );
    }
  }
  for (const m of [1.5, 2, 2.5]) {
    for (const z of [16, 20, 24, 30, 36]) {
      out.push(
        item(
          `herr-m${String(m).replace(".", "p")}-${z}`,
          `Herringbone ${z}T · M${m}`,
          "Gears",
          "NopSCADlib herringbone",
          "dual helix",
          { kind: "herringbone", teeth: z, module: m, bore: boreFor(m), t: 12 },
        ),
      );
    }
  }
  for (const m of [1, 1.5, 2, 2.5]) {
    for (const z of [8, 12, 16, 20, 24, 30]) {
      out.push(
        item(`rack-m${String(m).replace(".", "p")}-${z}`, `Rack ${z}T · M${m}`, "Gears", "MCAD rack", "linear", {
          kind: "rack",
          teeth: z,
          module: m,
          t: 8,
        }),
      );
    }
  }
  for (const z of [12, 16, 20, 24, 30]) {
    out.push(
      item(`bevel-${z}`, `Bevel ${z}T · M2`, "Gears", "straight bevel (parametric)", "miter", {
        kind: "bevel",
        teeth: z,
        module: 2,
        bore: 5,
        t: 10,
      }),
    );
  }
  for (const n of [1, 2, 3, 4]) {
    out.push(
      item(`worm-m2-${n}`, `Worm ${n}-start · M2`, "Gears", "cylindrical worm", `${n} start`, {
        kind: "worm",
        teeth: n,
        module: 2,
        bore: 5,
        length: 20 + n * 4,
      }),
    );
  }

  const pairs: [number, number][] = [
    [10, 30],
    [10, 40],
    [12, 36],
    [12, 48],
    [15, 45],
    [16, 32],
    [16, 48],
    [18, 54],
    [20, 40],
    [20, 60],
    [24, 48],
    [24, 72],
    [12, 24],
    [14, 42],
    [16, 64],
    [20, 80],
  ];
  for (const [z1, z2] of pairs) {
    out.push(
      item(`comp-${z1}-${z2}`, `Compound ${z1}/${z2}T`, "Compound", "stacked spur pair", `ratio ${(z2 / z1).toFixed(1)}:1`, {
        kind: "compound",
        teeth: z1,
        teeth2: z2,
        module: 2,
        bore: 5,
        t: 16,
      }),
    );
  }

  for (const z of [16, 20, 24, 30, 36, 40, 48, 60]) {
    for (const bore of [5, 8]) {
      out.push(
        item(`gt2-${z}-b${bore}`, `GT2 ${z}T · Ø${bore}`, "Motion", "GT2 2 mm pitch (open)", "flanged pulley", {
          kind: "pulley",
          teeth: z,
          pitch: 2,
          bore,
          t: 8,
        }),
      );
    }
  }
  for (const z of [12, 16, 20, 24, 30]) {
    out.push(
      item(`htd5-${z}`, `HTD 5M ${z}T`, "Motion", "HTD 5 mm pitch", "timing", {
        kind: "pulley",
        teeth: z,
        pitch: 5,
        bore: 8,
        t: 12,
      }),
    );
  }

  const bearings: [string, number, number, number][] = [
    ["608", 22, 8, 7],
    ["609", 24, 9, 7],
    ["623", 10, 3, 4],
    ["624", 13, 4, 5],
    ["625", 16, 5, 5],
    ["626", 19, 6, 6],
    ["627", 22, 7, 7],
    ["6000", 26, 10, 8],
    ["6001", 28, 12, 8],
    ["6002", 32, 15, 9],
    ["6200", 30, 10, 9],
    ["6201", 32, 12, 10],
    ["6202", 35, 15, 11],
    ["6900", 22, 10, 6],
    ["6901", 24, 12, 6],
    ["6902", 28, 15, 7],
    ["R188", 12.7, 6.35, 4.76],
    ["MR105", 10, 5, 4],
  ];
  for (const [name, od, id, w] of bearings) {
    out.push(item(`brg-${name}`, `${name} bearing`, "Motion", "ISO / skate", `Ø${od} × ${w} · Ø${id}`, { kind: "bearing", od, id, width: w }));
  }
  for (const d of [3, 4, 5, 6, 8, 10]) {
    out.push(
      item(`coup-${d}`, `Shaft coupling ${d} mm`, "Motion", "printed clamp coupling", `bore ${d}`, {
        kind: "coupling",
        od: d * 3 + 4,
        id: d,
        length: 18 + d,
      }),
    );
  }
  for (const [od, id, h] of [
    [8, 4, 8],
    [10, 5, 10],
    [12, 6, 12],
    [14, 8, 16],
    [16, 8, 20],
    [18, 10, 16],
  ] as [number, number, number][]) {
    out.push(item(`bush-${od}-${h}`, `Bushing Ø${od} × ${h}`, "Motion", "plain bearing", `ID ${id}`, { kind: "bushing", od, id, height: h }));
  }

  const standoffM: [string, number, number][] = [
    ["m3", 6, 3.4],
    ["m4", 8, 4.5],
    ["m5", 10, 5.5],
  ];
  for (const [name, od, id] of standoffM) {
    for (const h of [6, 8, 10, 12, 16, 20, 25, 30]) {
      out.push(
        item(`so-${name}-${h}`, `${name.toUpperCase()} standoff ${h}`, "Hardware", "ISO standoff", `hex · ${h} mm`, {
          kind: "standoff",
          od,
          id,
          height: h,
        }),
      );
    }
  }
  for (const od of [20, 24, 28, 32, 40, 48]) {
    out.push(
      item(`knob-${od}`, `Knurled knob Ø${od}`, "Hardware", "printed thumbscrew", `${od >= 32 ? 8 : 6} flutes`, {
        kind: "knob",
        od,
        flutes: od >= 32 ? 8 : 6,
        height: 10 + od / 8,
        bore: od >= 32 ? 6 : 4,
      }),
    );
  }
  for (const a of [20, 25, 30, 40, 50, 60, 80]) {
    out.push(
      item(`lbr-${a}`, `L-bracket ${a}`, "Frames", "OpenBuilds-style", `${a} × ${a} × 4`, {
        kind: "bracket",
        a,
        b: a,
        t: a >= 50 ? 5 : 4,
        hole: a >= 40 ? 4.5 : 3.4,
      }),
    );
  }
  for (const size of [8, 11, 14, 17, 23] as const) {
    out.push(
      item(`nema-${size}`, `NEMA ${size} face`, "Frames", "IEC 60072 / NEMA", `stepper mount`, { kind: "nema", size, t: size >= 17 ? 5 : 4 }),
    );
  }
  for (const a of [20, 30, 40]) {
    for (const len of [40, 60, 80]) {
      out.push(item(`tslot-${a}-${len}`, `T-slot ${a}×${a} × ${len}`, "Frames", "2020-style extrusion", "aluminum profile", { kind: "tslot", a, length: len }));
    }
  }
  for (const a of [30, 40, 50, 60]) {
    out.push(item(`hinge-${a}`, `Hinge ${a}`, "Frames", "print-in-place knuckle", `${a} mm leaf`, { kind: "hinge", a, b: 16, t: 3 }));
  }
  for (const od of [32, 40, 50, 60, 80, 100]) {
    out.push(
      item(`flg-${od}`, `Flange Ø${od}`, "Frames", "4-bolt pattern", "shaft collar", { kind: "flange", od, bore: od * 0.4, t: 6, hole: od >= 60 ? 5.5 : 4.5 }),
    );
  }

  const iso: [string, number, number][] = [
    ["m3", 3.4, 6.5],
    ["m4", 4.5, 8],
    ["m5", 5.5, 10],
    ["m6", 6.6, 12],
    ["m8", 9, 16],
    ["m10", 11, 20],
  ];
  for (const [name, id, od] of iso) {
    out.push(item(`wash-${name}`, `${name.toUpperCase()} washer`, "Fasteners", "ISO 7089", `Ø${od}`, { kind: "washer", od, id, width: 1.6 }));
    out.push(item(`nut-${name}`, `${name.toUpperCase()} nut`, "Fasteners", "ISO 4032 printed", "hex", { kind: "nut", od, id, height: od * 0.45 }));
    for (const h of [8, 12, 16, 20]) {
      out.push(
        item(`bolt-${name}-${h}`, `${name.toUpperCase()} bolt ${h}`, "Fasteners", "printed hex bolt", `${h} mm`, {
          kind: "bolt",
          od: od * 0.7,
          id,
          height: h,
        }),
      );
    }
  }

  const shop: [string, string, SolidSpec, string][] = [
    ["cube-20", "20 mm calibration cube", { kind: "cube", a: 20 }, "20³"],
    ["cube-xyz", "XYZ calibration cube", { kind: "xyzcube", a: 20 }, "axes 20³"],
    ["box-80", "Lidded box 80×60", { kind: "box", width: 80, height: 60, t: 25 }, "open bin"],
    ["box-snap", "Snap-fit box", { kind: "snapbox", width: 80, height: 60, t: 28 }, "lid lip"],
    ["hook-coat", "Coat hook", { kind: "hook", a: 18, b: 42, t: 10 }, "J-hook"],
    ["hook-headphone", "Headphone hook", { kind: "headhook", a: 36, b: 52, t: 10 }, "dual U"],
    ["clip-cable", "Cable clip", { kind: "clip", a: 16, b: 18, t: 10 }, "U-clip"],
    ["clip-filament", "Filament clip", { kind: "clip", a: 14, b: 16, t: 12 }, "1.75 mm"],
    ["clip-gt2", "GT2 belt clip", { kind: "beltclip", a: 28, b: 18, t: 12 }, "toothed clamp"],
    ["clip-led", "LED strip clip", { kind: "ledclip", a: 12, b: 10, t: 8 }, "C-clip"],
    ["stand-phone", "Phone stand", { kind: "stand", width: 70, height: 80, t: 4 }, "easel"],
    ["opener-bottle", "Bottle opener", { kind: "opener", length: 80 }, "cap lift"],
    ["disk-coaster", "Coaster Ø90", { kind: "disk", od: 90, t: 4 }, "flat disk"],
    ["card-biz", "Business card", { kind: "card", t: 0.8 }, "85.6 × 54"],
    ["plate-name", "Name plate", { kind: "nameplate", width: 80, height: 30, t: 8 }, "feet"],
    ["bin-gf-11", "Gridfinity bin 1×1", { kind: "bin", width: 42, height: 42, t: 21 }, "42 mm"],
    ["bin-gf-21", "Gridfinity bin 2×1", { kind: "bin", width: 84, height: 42, t: 21 }, "84 × 42"],
    ["grid-gf-22", "Gridfinity base 2×2", { kind: "grid", size: 2 }, "84 × 84"],
    ["grill-40", "Fan grill 40 mm", { kind: "grill", od: 40, t: 3 }, "40 mm"],
    ["grill-80", "Fan grill 80 mm", { kind: "grill", od: 80, t: 3 }, "80 mm"],
    ["wrench-m8", "Open wrench M8", { kind: "wrench", length: 90, od: 13 }, "13 mm jaw"],
    ["comb-5", "Cable comb 5", { kind: "comb", length: 40, flutes: 5 }, "5 slot"],
    ["hull-benchy", "3D Benchy", { kind: "hull" }, "hull 60 × 31 × 48"],
    ["spinner-m5", "Nut spinner M5", { kind: "spinner", od: 10, id: 5.5 }, "hex + T"],
    ["ruler-100", "Scale ruler 100", { kind: "ruler", length: 100 }, "100 × 20 × 3"],
    ["case-pi", "Pi case", { kind: "case", width: 90, height: 60, t: 25 }, "board box"],
    ["picam", "Pi camera mount", { kind: "picam", t: 3 }, "25 × 24 · 21×12.8"],
    ["picam-arm", "Pi cam arm", { kind: "arm", a: 50, b: 24, t: 16 }, "arm + cam plate"],
    ["holder-sd", "SD card holder", { kind: "comb", length: 48, flutes: 8 }, "8 slot"],
    ["spool-fork", "Spool holder", { kind: "spool", width: 80, height: 70, t: 16 }, "upright fork"],
    ["gopro", "GoPro style mount", { kind: "gopro", a: 32, b: 24, t: 18 }, "two-prong"],
    ["collar-8", "Shaft collar Ø8", { kind: "collar", od: 22, id: 8, t: 8 }, "clamp ring"],
    ["coup-flex-5", "Flexible coupling Ø5", { kind: "flexcoup", od: 20, id: 5, length: 28 }, "printed spider"],
    ["gt2-idler-20", "GT2 idler 20T", { kind: "idler", teeth: 20, pitch: 2, bore: 5, t: 8 }, "smooth flanges"],
    ["knob-drawer", "Drawer knob", { kind: "mushroom", od: 28, height: 18, bore: 4 }, "mushroom"],
  ];
  for (const [id, name, solid, hint] of shop) {
    out.push(item(id, name, "Shop", "PXD2 parametric twin", hint, solid));
  }

  const seen = new Set<string>();
  return out.filter((x) => {
    if (seen.has(x.id)) return false;
    seen.add(x.id);
    return true;
  });
}

export const LIBRARY: LibItem[] = buildLibrary();

export function libById(id: string) {
  return LIBRARY.find((x) => x.id === id) ?? null;
}

export function libMatch(q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return null;
  return (
    LIBRARY.find((x) => x.id === s || x.name.toLowerCase() === s) ||
    LIBRARY.find((x) => x.name.toLowerCase().includes(s) || x.id.includes(s.replace(/\s+/g, "-")))
  );
}

export function partFromLib(item: LibItem): Part {
  const env = envelopeOf(item.solid);
  return {
    name: item.id,
    width: env.width,
    height: env.height,
    thick: env.thick,
    holes: item.solid.bore ? [{ x: 0, y: 0, d: item.solid.bore }] : [],
    tiles: null,
    ask: item.name,
    notes: [`${item.source} · ${item.hint}`],
    solid: item.solid,
  };
}

export function partFromSolid(solid: SolidSpec, name: string = solid.kind): Part {
  const env = envelopeOf(solid);
  return {
    name,
    width: env.width,
    height: env.height,
    thick: env.thick,
    holes: solid.bore ? [{ x: 0, y: 0, d: solid.bore }] : [],
    tiles: null,
    ask: name,
    notes: [`${solid.kind}`],
    solid,
  };
}

export function scadFromSolid(solid: SolidSpec, name: string = solid.kind) {
  return item(name, name, "Gears", "shop", "", solid).scad;
}
