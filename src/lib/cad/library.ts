import type { Hole, Part } from "./types";
import { envelopeOf, scadPragma, type SolidKind, type SolidSpec } from "./solid-spec.ts";

export type LibItem = {
  id: string;
  name: string;
  group: "Gears" | "Compound" | "Motion" | "Belts" | "Drive" | "Motors" | "Hardware" | "Fasteners" | "Frames" | "Electronics" | "Shop";
  source: string;
  hint: string;
  solid: SolidSpec;
  scad: string;
};

export const LIB_GROUPS: LibItem["group"][] = [
  "Gears",
  "Compound",
  "Motion",
  "Belts",
  "Drive",
  "Motors",
  "Hardware",
  "Fasteners",
  "Frames",
  "Electronics",
  "Shop",
];

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
  for (const size of [8, 11, 14, 17, 23, 24, 34, 42] as const) {
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

  const belts: [string, string, SolidSpec, string][] = [
    ["gt2-loop-100", "GT2 loop 200 mm", { kind: "belt", teeth: 100, pitch: 2, t: 6 }, "100T · 6 mm"],
    ["gt2-loop-152", "GT2 loop 304 mm", { kind: "belt", teeth: 152, pitch: 2, t: 6 }, "152T"],
    ["gt2-loop-200", "GT2 loop 400 mm", { kind: "belt", teeth: 200, pitch: 2, t: 6 }, "200T"],
    ["gt2-loop-250", "GT2 loop 500 mm", { kind: "belt", teeth: 250, pitch: 2, t: 6 }, "250T"],
    ["gt2-loop-300", "GT2 loop 610 mm", { kind: "belt", teeth: 305, pitch: 2, t: 6 }, "305T"],
    ["gt2-open-500", "GT2 open 500 mm", { kind: "belt", teeth: 250, pitch: 2, t: 6 }, "open"],
    ["gt3-loop-100", "GT3 loop 300 mm", { kind: "belt", teeth: 100, pitch: 3, t: 9 }, "100T · 9 mm"],
    ["htd3-loop-100", "HTD 3M loop 300", { kind: "belt", teeth: 100, pitch: 3, t: 9 }, "3 mm pitch"],
    ["htd5-loop-80", "HTD 5M loop 400", { kind: "belt", teeth: 80, pitch: 5, t: 15 }, "5 mm pitch"],
    ["t5-loop-80", "T5 loop 400 mm", { kind: "belt", teeth: 80, pitch: 5, t: 10 }, "T5"],
    ["t2p5-loop-120", "T2.5 loop 300", { kind: "belt", teeth: 120, pitch: 2.5, t: 6 }, "T2.5"],
    ["mxl-loop-100", "MXL loop 203 mm", { kind: "belt", teeth: 100, pitch: 2.032, t: 6.35 }, "MXL"],
    ["vbelt-a-800", "V-belt A 800", { kind: "belt", teeth: 0, pitch: 0, t: 13, length: 800, od: 80 }, "A-section"],
    ["oring-608", "O-ring 608", { kind: "belt", teeth: 40, pitch: 2, t: 1.8 }, "dash for 608"],
    ["oring-2-50", "O-ring Ø50", { kind: "belt", teeth: 80, pitch: 2, t: 2.5 }, "static seal"],
  ];
  for (const [id, name, solid, hint] of belts) {
    out.push(item(id, name, "Belts", "closed loop / open", hint, solid));
  }

  for (const od of [5, 8, 10, 12] as const) {
    for (const len of [40, 80, 120, 200]) {
      if (od >= 12 && len === 40) continue;
      out.push(
        item(`shaft-${od}-${len}`, `Shaft Ø${od} × ${len}`, "Drive", "ground rod", `D${od}`, {
          kind: "shaft",
          od,
          length: len,
        }),
      );
    }
  }
  out.push(item("shaft-5-d", "D-shaft Ø5 × 80", "Drive", "motor D-flat", "flat", { kind: "shaft", od: 5, length: 80, flutes: 1 }));
  for (const len of [80, 150, 200, 300]) {
    out.push(
      item(`t8-${len}`, `T8 leadscrew ${len}`, "Drive", "trapezoid 2 mm", "T8", {
        kind: "leadscrew",
        od: 8,
        length: len,
        pitch: 2,
        bore: 0,
      }),
    );
  }
  out.push(item("t8-nut", "T8 anti-backlash nut", "Drive", "POM nut", "T8", { kind: "nut", od: 22, id: 8, height: 15 }));
  for (const z of [9, 12, 15, 18, 21]) {
    out.push(
      item(`sprocket-08b-${z}`, `Sprocket 08B ${z}T`, "Drive", "roller chain", "12.7 mm", {
        kind: "sprocket",
        teeth: z,
        pitch: 12.7,
        bore: 8,
        t: 8,
      }),
    );
  }
  out.push(item("chain-08b-10", "Chain 08B × 10", "Drive", "roller chain", "10 link", { kind: "chain", length: 127, t: 8 }));
  for (const [od, id, len] of [
    [10, 6, 25],
    [12, 8, 30],
    [16, 10, 40],
    [20, 12, 50],
  ] as [number, number, number][]) {
    out.push(item(`spring-${od}-${len}`, `Spring Ø${od} × ${len}`, "Drive", "compression", `ID ${id}`, { kind: "spring", od, id, length: len }));
  }
  for (const len of [80, 100, 150, 200]) {
    out.push(item(`mgn12-${len}`, `MGN12 rail ${len}`, "Drive", "linear rail", "carriage", { kind: "rail", a: 12, length: len }));
  }
  for (const od of [48, 60, 80, 100]) {
    out.push(item(`wheel-${od}`, `Wheel Ø${od}`, "Drive", "rubber + hub", `608-ready`, { kind: "wheel", od, bore: 8, t: od >= 80 ? 16 : 12 }));
  }
  out.push(item("omni-48", "Omni wheel Ø48", "Drive", "lateral roll", "omni", { kind: "wheel", od: 48, bore: 5, t: 14 }));
  for (const len of [40, 80, 160]) {
    out.push(item(`pipe-half-${len}`, `Pipe ½″ × ${len}`, "Drive", "PVC / EMT", "Ø21.3", { kind: "pipe", od: 21.3, id: 15.8, length: len }));
  }
  out.push(item("servo-sg90", "Servo SG90", "Electronics", "9 g micro", "23 × 12.5", { kind: "servo", width: 23, height: 12.5, t: 22 }));
  out.push(item("servo-mg996", "Servo MG996", "Electronics", "metal gear", "40 × 20", { kind: "servo", width: 40, height: 20, t: 38 }));
  for (const z of [16, 20, 24, 30]) {
    out.push(
      item(`helical-${z}`, `Helical ${z}T · M2`, "Gears", "helix spur", "quiet", {
        kind: "helical",
        teeth: z,
        module: 2,
        bore: 5,
        t: 10,
      }),
    );
  }
  for (const z of [32, 40, 48, 60]) {
    out.push(
      item(`internal-${z}`, `Internal ${z}T · M2`, "Gears", "ring gear", "planetary", {
        kind: "internal",
        teeth: z,
        module: 2,
        t: 8,
      }),
    );
  }
  out.push(
    item("planetary-3", "Planetary 3-planet", "Gears", "sun · 3 planet · ring", "12/36", {
      kind: "planetary",
      teeth: 12,
      teeth2: 36,
      module: 1.5,
      t: 8,
    }),
  );
  for (const [name, od, id, h] of [
    ["m3", 4.6, 3, 5],
    ["m4", 6.3, 4, 6],
    ["m5", 8, 5, 7],
  ] as [string, number, number, number][]) {
    out.push(
      item(`insert-${name}`, `Heat-set ${name.toUpperCase()}`, "Fasteners", "brass insert", `${h} mm`, {
        kind: "insert",
        od,
        id,
        height: h,
      }),
    );
  }
  for (const a of [20, 30, 40]) {
    out.push(item(`corner-${a}`, `${a} corner cube`, "Frames", "3-way extrusion", `${a}³`, { kind: "corner", a }));
  }
  for (const [od, t] of [
    [40, 10],
    [40, 20],
    [80, 15],
    [80, 25],
    [120, 25],
  ] as [number, number][]) {
    out.push(item(`fan-${od}-${t}`, `Fan ${od}×${t}`, "Electronics", "axial", `${od} mm`, { kind: "fan", od, t }));
  }
  out.push(item("batt-18650", "18650 holder ×2", "Electronics", "cell cradle", "2 cell", { kind: "battery", width: 40, height: 22, t: 20 }));
  out.push(item("uno-plate", "Arduino UNO plate", "Electronics", "R3 footprint", "68.6 × 53.4", { kind: "arduino", t: 4 }));

  const drones: [string, number, number, number, number, number, string][] = [
    ["0603", 8.5, 7, 1, 6.6, 3, "smallest whoop"],
    ["0703", 9.2, 8, 1, 6.6, 3, "tiny whoop"],
    ["0802", 10.5, 8, 1, 6.6, 2, "tiny whoop"],
    ["1103", 14.2, 11, 1.5, 6.6, 3, "tiny whoop"],
    ["1104", 14.4, 12, 1.5, 6.6, 4, "65 mm"],
    ["1106", 14.6, 14, 1.5, 6.6, 6, "65 mm"],
    ["1306", 17.2, 14, 2, 9, 6, "3″ light"],
    ["1404", 18.2, 12, 2, 9, 4, "2″"],
    ["1408", 18.6, 16, 2, 9, 8, "3″ light"],
    ["1507", 19.4, 16, 2, 9, 7, "3″"],
    ["1606", 20.5, 16, 2, 12, 6, "4″"],
    ["1804", 23, 12, 2, 12, 4, "cinewhoop"],
    ["1806", 23, 14, 2, 12, 6, "cinewhoop"],
    ["2204", 27.9, 16, 3, 16, 4, "5″ light"],
    ["2205", 27.9, 18, 3, 16, 5, "5″"],
    ["2206", 27.9, 19, 4, 16, 6, "5″"],
    ["2207", 27.9, 21, 4, 16, 7, "5″ freestyle"],
    ["2208", 28.2, 22, 4, 16, 8, "5″ long"],
    ["2306", 28.5, 20, 4, 16, 6, "5″"],
    ["2407", 29.6, 21, 4, 16, 7, "6″"],
    ["2408", 30, 22, 5, 16, 8, "6″"],
    ["2506", 30.5, 20, 4, 16, 6, "6″"],
    ["2806", 35, 20, 4, 16, 6, "7″"],
    ["2807", 35.2, 22, 5, 19, 7, "7″"],
    ["2808", 35.5, 24, 5, 19, 8, "7″ long"],
    ["3110", 38.5, 26, 5, 19, 10, "8–10″"],
    ["3115", 39, 32, 5, 19, 15, "10″"],
    ["4108", 48, 26, 5, 25, 8, "cine"],
    ["4214", 49.5, 32, 6, 25, 14, "X8 cine"],
    ["5010", 59, 30, 6, 25, 10, "X8"],
    ["5015", 59.5, 36, 6, 30, 15, "X8 long"],
    ["5212", 61, 34, 6, 30, 12, "10″ lift"],
    ["6354", 70, 42, 8, 30, 54, "heavy cine"],
  ];
  for (const [name, od, len, shaft, mount, stator, hint] of drones) {
    out.push(
      item(`motor-${name}`, `Drone ${name}`, "Motors", "BLDC outrunner", `${hint} · Ø${od} · Ø${shaft}`, {
        kind: "motor",
        size: 1,
        od,
        length: len,
        bore: shaft,
        t: Math.max(8, shaft * 3),
        a: mount,
        teeth: stator,
      }),
    );
  }

  const inrunners: [string, number, number, number, string][] = [
    ["2830", 28, 30, 3.17, "inrunner"],
    ["2847", 28, 47, 3.17, "inrunner"],
    ["3650", 36, 50, 5, "e-skate"],
    ["3674", 36, 74, 5, "e-skate"],
    ["4074", 40, 74, 5, "e-skate"],
    ["4082", 40, 82, 8, "e-skate"],
    ["5065", 50, 65, 8, "hub-drive"],
    ["6374", 63, 74, 8, "e-skate"],
    ["80100", 80, 100, 10, "big BLDC"],
  ];
  for (const [name, od, len, shaft, hint] of inrunners) {
    out.push(
      item(`motor-in-${name}`, `Inrunner ${name}`, "Motors", "sensored BLDC", `${hint} · Ø${od} × ${len}`, {
        kind: "motor",
        size: 2,
        od,
        length: len,
        bore: shaft,
        t: 18,
      }),
    );
  }

  const brushed: [string, number, number, number, string][] = [
    ["130", 20.4, 25, 2, "toy"],
    ["180", 24, 27, 2, "hobby"],
    ["370", 24.4, 30, 2, "hobby"],
    ["385", 27.7, 38, 3.17, "RS-385"],
    ["540", 36, 50, 3.17, "RS-540"],
    ["550", 36, 50, 3.17, "RS-550"],
    ["555", 36, 57, 3.17, "RS-555"],
    ["775", 42, 66, 5, "RS-775"],
    ["895", 48, 70, 5, "RS-895"],
  ];
  for (const [name, od, len, shaft, hint] of brushed) {
    out.push(
      item(`motor-dc-${name}`, `Brushed ${name}`, "Motors", "ferrite can", `${hint} · Ø${od} × ${len}`, {
        kind: "motor",
        size: 3,
        od,
        length: len,
        bore: shaft,
        t: name === "775" || name === "895" ? 18 : 12,
      }),
    );
  }

  out.push(
    item("motor-n20", "N20 gearmotor", "Motors", "micro metal", "12 × 10 × 15 + box", {
      kind: "motor",
      size: 4,
      od: 12,
      length: 15,
      a: 12,
      b: 10,
      height: 9,
      bore: 3,
      t: 10,
    }),
  );
  out.push(
    item("motor-n30", "N30 gearmotor", "Motors", "micro metal", "15 × 12", {
      kind: "motor",
      size: 4,
      od: 15.5,
      length: 20,
      a: 15,
      b: 12,
      height: 11,
      bore: 3,
      t: 10,
    }),
  );
  out.push(
    item("motor-ga37-12", "GA37 12V gearmotor", "Motors", "37 mm planetary", "Ø37 × 54", {
      kind: "motor",
      size: 4,
      od: 37,
      length: 30,
      a: 37,
      b: 37,
      height: 24,
      bore: 6,
      t: 16,
    }),
  );
  out.push(
    item("motor-jgy370", "JGY-370 worm gearmotor", "Motors", "worm box", "Ø25 × 67", {
      kind: "motor",
      size: 4,
      od: 25,
      length: 32,
      a: 46,
      b: 32,
      height: 22,
      bore: 6,
      t: 14,
    }),
  );
  out.push(
    item("motor-5840", "5840-31ZY worm", "Motors", "high-torque worm", "Ø40 × 105", {
      kind: "motor",
      size: 4,
      od: 40,
      length: 55,
      a: 58,
      b: 40,
      height: 32,
      bore: 8,
      t: 20,
    }),
  );

  const steppers: [number, number, string][] = [
    [8, 30, "20.4"],
    [11, 32, "28.2"],
    [14, 28, "35.2"],
    [17, 13, "pancake"],
    [17, 16, "slim pancake"],
    [17, 20, "slim"],
    [17, 34, "short"],
    [17, 40, "std"],
    [17, 48, "high-T"],
    [17, 60, "long"],
    [23, 41, "short"],
    [23, 56, "std"],
    [23, 76, "high-T"],
    [23, 104, "long"],
    [24, 56, "60 mm"],
    [34, 80, "86 mm"],
    [34, 150, "long"],
    [42, 150, "110 mm"],
  ];
  for (const [nema, len, hint] of steppers) {
    const d = nema === 8 ? 20.4 : nema === 11 ? 28.2 : nema === 14 ? 35.2 : nema === 23 ? 56.4 : nema === 24 ? 60 : nema === 34 ? 86 : nema === 42 ? 110 : 42.3;
    const shaft = nema <= 14 ? 5 : nema === 17 ? 5 : nema === 23 ? 6.35 : nema === 24 ? 8 : nema === 34 ? 14 : 19;
    out.push(
      item(`stepper-${nema}-${len}`, `NEMA ${nema} × ${len}`, "Motors", "hybrid stepper body", `${hint} · Ø${shaft} shaft`, {
        kind: "motor",
        size: 7,
        od: d,
        length: len,
        t: nema >= 34 ? 32 : 24,
        a: nema,
        bore: shaft,
      }),
    );
  }

  const ev: [string, string, number, number, number, number, string][] = [
    ["my1016-350", "MY1016 36V 350W", 100, 105, 10, 9, "scooter · 36 volt"],
    ["my1020-1000", "MY1020 48V 1000 watt", 107, 125, 12, 11, "T8F-11T · 48 volt"],
    ["my1020-1500", "MY1020 48V 1500 watt", 107, 135, 12, 11, "T8F-11T · 48 volt"],
    ["my1020-2000", "MY1020 48V 2000 watt", 107, 135, 12, 11, "T8F-11T · 48 volt"],
    ["vevor-48-3000", "Vevor 48V 3000 watt", 107, 135, 12, 11, "MY1020D · T8F-11T · Ø12 · 48 volt 3000W"],
    ["vevor-72-3000", "Vevor 72V 3000 watt", 107, 135, 12, 11, "MY1020 · 4900 rpm · 72 volt 3000W"],
    ["bmc-48-500", "BM1418 48V 500 watt", 118, 95, 10, 0, "mid-drive can · 48 volt"],
  ];
  for (const [id, name, od, len, shaft, teeth, hint] of ev) {
    out.push(
      item(id, name, "Motors", "e-bike / go-kart BLDC", `${hint} · Ø${od} × ${len}`, {
        kind: "motor",
        size: 5,
        od,
        length: len,
        bore: shaft,
        t: 25,
        a: 56,
        b: 102,
        teeth: teeth || 11,
        pitch: 8,
      }),
    );
  }

  const hubs: [string, string, number, number, number, string][] = [
    ["hub-65", "Hoverboard hub 6.5″", 165, 55, 12, "6.5″"],
    ["hub-80", "Hoverboard hub 8″", 200, 60, 12, "8″"],
    ["hub-10-1000", "E-bike hub 10″ 1000 watt", 255, 70, 12, "48V 1000W"],
    ["hub-10-3000", "Vevor hub 10″ 3000 watt", 273, 90, 14, "48 volt 3000W"],
    ["hub-12-3000", "Vevor hub 12″ 3000 watt", 305, 110, 14, "48 volt 3000W"],
  ];
  for (const [id, name, od, wide, axle, hint] of hubs) {
    out.push(
      item(id, name, "Motors", "direct-drive hub", `${hint} · Ø${od}`, {
        kind: "motor",
        size: 6,
        od,
        length: wide,
        bore: axle,
        t: 0,
      }),
    );
  }

  out.push(item("servo-ds3218", "Servo DS3218", "Electronics", "20 kg digital", "40 × 20 × 40.5", { kind: "servo", width: 40, height: 20, t: 40.5 }));
  out.push(item("servo-40kg", "Servo 40 kg", "Electronics", "steering", "65 × 30 × 48", { kind: "servo", width: 65, height: 30, t: 48 }));

  const seen = new Set<string>();
  return out.filter((x) => {
    if (seen.has(x.id)) return false;
    seen.add(x.id);
    return true;
  });
}

export const LIBRARY: LibItem[] = buildLibrary();

export function holesForSolid(s: SolidSpec): Hole[] {
  if (s.kind === "nema") return nemaMountHoles(s.size ?? 17);
  if (s.kind === "motor") return motorMountHoles(s);
  if (s.bore && s.bore > 0.2) return [{ x: 0, y: 0, d: s.bore }];
  if (s.hole && s.hole > 0.2) return [{ x: 0, y: 0, d: s.hole }];
  if (s.id && s.id > 0.2) return [{ x: 0, y: 0, d: s.id }];
  return [];
}

function nemaMountHoles(size: number): Hole[] {
  const pattern =
    size === 8 ? 16 : size === 11 ? 23 : size === 14 ? 26 : size === 23 ? 47.14 : size === 24 ? 49.5 : size === 34 ? 69.6 : size === 42 ? 89 : 31;
  const bore = size === 8 ? 16 : size === 23 || size === 24 ? 38.1 : size === 34 ? 73 : size === 42 ? 80 : 22;
  const hole = size <= 14 ? 2.5 : size === 17 ? 3.2 : size >= 34 ? 5.5 : 5.2;
  const p = pattern / 2;
  return [
    { x: 0, y: 0, d: bore },
    { x: -p, y: -p, d: hole },
    { x: p, y: -p, d: hole },
    { x: p, y: p, d: hole },
    { x: -p, y: p, d: hole },
  ];
}

function motorMountHoles(s: SolidSpec): Hole[] {
  const style = s.size ?? 1;
  const shaft = s.bore ?? 4;
  if (style === 7) return nemaMountHoles(s.a ?? 17);
  if (style === 6) return [{ x: 0, y: 0, d: Math.max(shaft, 8) }];
  if (style === 5) {
    const footL = s.b ?? 102;
    const footW = s.a ?? 56;
    const hx = Math.max(12, footL * 0.42);
    const hy = Math.max(10, footW * 0.35);
    return [
      { x: 0, y: 0, d: shaft },
      { x: -hx, y: -hy, d: 6.6 },
      { x: hx, y: -hy, d: 6.6 },
      { x: hx, y: hy, d: 6.6 },
      { x: -hx, y: hy, d: 6.6 },
    ];
  }
  if (style === 4) {
    const w = s.a ?? 12;
    return [
      { x: 0, y: 0, d: shaft },
      { x: -w * 0.28, y: 0, d: 2.2 },
      { x: w * 0.28, y: 0, d: 2.2 },
    ];
  }
  const mount = s.a ?? 16;
  const p = mount / 2;
  const hole = mount < 10 ? 1.4 : mount < 18 ? 2.2 : 3.2;
  return [
    { x: 0, y: 0, d: shaft },
    { x: -p, y: -p, d: hole },
    { x: p, y: -p, d: hole },
    { x: p, y: p, d: hole },
    { x: -p, y: p, d: hole },
  ];
}

export function libById(id: string) {
  return LIBRARY.find((x) => x.id === id) ?? null;
}

export function libMatch(q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return null;
  if (/(smallest|tiniest|tiny whoop).*(motor|drone)|whoop motor/.test(s) || /smallest drone/.test(s)) {
    return libById("motor-0603") ?? libById("motor-0802");
  }
  if (/vevor/.test(s) && /hub/.test(s) && /12/.test(s)) return libById("hub-12-3000");
  if (/vevor/.test(s) && /hub/.test(s)) return libById("hub-10-3000");
  if (/vevor/.test(s) && /72/.test(s)) return libById("vevor-72-3000");
  if (/vevor/.test(s) && /3000/.test(s)) return libById("vevor-48-3000");
  if (/3000/.test(s) && /(watt|\bw\b|48)/.test(s) && /hub/.test(s)) return libById("hub-10-3000");
  if (/3000/.test(s) && /(watt|\bw\b)/.test(s) && /48/.test(s)) return libById("vevor-48-3000");
  const words = s.split(/\s+/).filter(Boolean);
  return (
    LIBRARY.find((x) => x.id === s || x.name.toLowerCase() === s) ||
    LIBRARY.find((x) => x.id.includes(s.replace(/\s+/g, "-")) || x.name.toLowerCase().includes(s)) ||
    LIBRARY.find((x) => {
      const hay = `${x.id} ${x.name} ${x.hint} ${x.source} ${x.solid.kind} ${x.group}`.toLowerCase();
      return words.every((w) => hay.includes(w) || (w === "watt" && hay.includes("w")) || (w === "volt" && hay.includes("v")));
    })
  );
}

export function partFromLib(item: LibItem): Part {
  const env = envelopeOf(item.solid);
  return {
    name: item.id,
    width: env.width,
    height: env.height,
    thick: env.thick,
    holes: holesForSolid(item.solid),
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
    holes: holesForSolid(solid),
    tiles: null,
    ask: name,
    notes: [`${solid.kind}`],
    solid,
  };
}

export function scadFromSolid(solid: SolidSpec, name: string = solid.kind) {
  return item(name, name, "Gears", "shop", "", solid).scad;
}
