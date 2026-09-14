import { libById, libMatch, partFromLib } from "./library.ts";
import { defaultPart, type Part } from "./types.ts";

export type ThingHit = {
  id: string;
  thingId: number | null;
  name: string;
  maker: string;
  license: string;
  tags: string;
  url: string;
  twin: string;
  source: "thingiverse" | "github" | "pxd2";
  hint: string;
};

export const THING_TAGS = ["Gears", "Motion", "Hardware", "Mounts", "Organization", "Calibration"] as const;

function tv(
  thingId: number,
  name: string,
  maker: string,
  license: string,
  tags: string,
  twin: string,
  hint: string,
): ThingHit {
  return {
    id: `tv-${thingId}`,
    thingId,
    name,
    maker,
    license,
    tags,
    url: `https://www.thingiverse.com/thing:${thingId}`,
    twin,
    source: "thingiverse",
    hint,
  };
}

/** Open-hardware Thingiverse classics → dedicated PXD2 solids (same class as the NEMA face). */
export const THINGIVERSE: ThingHit[] = [
  tv(16627, "Parametric involute gear", "emmett", "CC-BY", "Gears", "spur-m2-20", "20T · M2 involute"),
  tv(16628, "Rack and pinion", "emmett", "CC-BY", "Gears", "rack-m2-16", "linear rack"),
  tv(16629, "Bevel gear", "emmett", "CC-BY", "Gears", "bevel-20", "straight miter"),
  tv(16630, "Worm and wheel", "emmett", "CC-BY", "Gears", "worm-m2-2", "2-start"),
  tv(16631, "Compound 20/40", "emmett", "CC-BY", "Gears", "comp-20-40", "2:1 stack"),
  tv(16632, "Compound 12/36", "emmett", "CC-BY", "Gears", "comp-12-36", "3:1"),
  tv(13362, "Herringbone gear pair", "thehans", "CC-BY", "Gears", "herr-m2-24", "dual helix"),
  tv(13380, "OpenSCAD gear kit", "thehans", "CC-BY", "Gears", "spur-m2-30", "30T · M2"),
  tv(1059, "Involute rack fine", "emmett", "CC-BY", "Gears", "rack-m1p5-16", "M1.5"),
  tv(53451, "GT2 timing pulley 20T", "mechadense", "CC-BY", "Motion", "gt2-20-b5", "2 mm pitch · Ø5"),
  tv(53448, "GT2 timing pulley 16T", "mechadense", "CC-BY", "Motion", "gt2-16-b5", "compact"),
  tv(33138, "GT2 idler 20T", "mechadense", "CC-BY", "Motion", "gt2-idler-20", "smooth bore"),
  tv(33121, "GT2 belt clip", "mechadense", "CC-BY", "Motion", "clip-gt2", "toothed clamp"),
  tv(28143, "608 skate bearing", "thieums", "CC-BY", "Motion", "brg-608", "Ø22 × 7 · Ø8"),
  tv(60800, "625 bearing", "jsheares", "CC-BY", "Motion", "brg-625", "Ø16 × 5 · Ø5"),
  tv(2014, "Parametric coupling", "emmett", "CC-BY", "Motion", "coup-5", "5 mm bore"),
  tv(51780, "Flexible coupling", "Gyrobot", "CC-BY", "Motion", "coup-flex-5", "printed spider"),
  tv(14242, "Linear bushing", "jsheares", "CC-BY", "Motion", "bush-12-12", "flanged ID 6"),
  tv(14054, "Shaft collar", "emmett", "CC-BY", "Motion", "collar-8", "clamp Ø8"),
  tv(9096, "20 mm calibration cube", "iomaa", "CC0", "Calibration", "cube-20", "20³"),
  tv(261398, "XYZ 20 mm cal cube", "iomaa", "CC0", "Calibration", "cube-xyz", "axes cube"),
  tv(763622, "3D Benchy", "CreativeTools", "CC-BY-ND", "Calibration", "hull-benchy", "hull 60 × 31 × 48"),
  tv(37381, "Business card", "tbuser", "CC-BY", "Calibration", "card-biz", "85.6 × 54"),
  tv(5573, "Scale ruler", "tbuser", "CC-BY", "Calibration", "ruler-100", "100 mm ticks"),
  tv(7631, "Name plate", "tbuser", "CC-BY", "Calibration", "plate-name", "plate + feet"),
  tv(27799, "Bottle opener", "thepoolshark", "CC-BY", "Hardware", "opener-bottle", "cap lift"),
  tv(9135, "Parametric wrench", "emmett", "CC-BY", "Hardware", "wrench-m8", "M8 jaw"),
  tv(34778, "Nut spinner M3–M8", "ibewcy", "CC-BY", "Hardware", "spinner-m5", "hex + T"),
  tv(55713, "Hex standoff pack", "tbuser", "CC-BY", "Hardware", "so-m3-12", "M3 × 12"),
  tv(203148, "Parametric washer", "tbuser", "CC-BY", "Hardware", "wash-m6", "ISO 7089"),
  tv(203149, "Parametric hex nut", "tbuser", "CC-BY", "Hardware", "nut-m6", "ISO 4032"),
  tv(28131, "M3 bolt printed", "tbuser", "CC-BY", "Hardware", "bolt-m3-12", "hex"),
  tv(28132, "M5 bolt printed", "tbuser", "CC-BY", "Hardware", "bolt-m5-16", "hex"),
  tv(21590, "Knurled knob", "mechadense", "CC-BY", "Hardware", "knob-32", "Ø32 knurl"),
  tv(151405, "Drawer knob", "airscapes", "CC-BY", "Hardware", "knob-drawer", "mushroom"),
  tv(105193, "Parametric hinge", "gybber", "CC-BY", "Hardware", "hinge-40", "print-in-place"),
  tv(28208, "L-bracket 40", "ibewcy", "CC-BY", "Hardware", "lbr-40", "40 × 40 × 4"),
  tv(14266, "Corner bracket 20", "nallath", "CC-BY", "Hardware", "lbr-20", "2020"),
  tv(14267, "Corner bracket 40", "nallath", "CC-BY", "Hardware", "lbr-40", "4040"),
  tv(15380, "2020 T-slot extrusion", "nallath", "CC-BY", "Hardware", "tslot-20-40", "20 × 20"),
  tv(37091, "Filament clip", "tdack", "CC-BY", "Organization", "clip-filament", "1.75 mm U-clip"),
  tv(215282, "Cable clip", "PrestonLee", "CC-BY", "Organization", "clip-cable", "desk U-clip"),
  tv(37910, "Coat hook", "flowalistic", "CC-BY", "Organization", "hook-coat", "J-hook"),
  tv(39117, "Headphone hook", "flowalistic", "CC-BY", "Organization", "hook-headphone", "dual U"),
  tv(28231, "Coaster", "MakerBot", "CC-BY", "Organization", "disk-coaster", "Ø90 × 4"),
  tv(182219, "Parametric box", "heartman", "CC-BY", "Organization", "box-80", "80 × 60 × 25"),
  tv(4147783, "Snap-fit box", "devemin", "CC-BY", "Organization", "box-snap", "lid lip"),
  tv(201430, "SD card holder", "heartman", "CC-BY", "Organization", "holder-sd", "8 slot"),
  tv(42083, "Cable comb", "heartman", "CC-BY", "Organization", "comb-5", "5 slot"),
  tv(21808, "LED clip", "heartman", "CC-BY", "Organization", "clip-led", "strip C-clip"),
  tv(2653394, "Gridfinity baseplate", "ZackFreedman", "CC-BY-SA", "Organization", "grid-gf-22", "2×2 · 42 mm"),
  tv(5175158, "Gridfinity bin 1×1", "eeSharp", "CC-BY-SA", "Organization", "bin-gf-11", "42 × 42 × 21"),
  tv(5175159, "Gridfinity bin 2×1", "eeSharp", "CC-BY-SA", "Organization", "bin-gf-21", "84 × 42 × 21"),
  tv(913443, "Drawer organizer", "Heartman", "CC-BY", "Organization", "box-80", "insert"),
  tv(33908, "Spool holder", "jsheares", "CC-BY", "Organization", "spool-fork", "upright fork"),
  tv(28236, "Phone stand", "ddelap", "CC-BY", "Mounts", "stand-phone", "easel"),
  tv(499047, "Pi camera mount", "ArnieO", "CC-BY", "Mounts", "picam", "25 × 24 · 4-hole"),
  tv(2183385, "Pi cam arm", "ArnieO", "CC-BY", "Mounts", "picam-arm", "arm + cam plate"),
  tv(909529, "Pi case", "luma", "CC-BY", "Mounts", "case-pi", "90 × 60 × 25"),
  tv(30140, "NEMA 17 face", "nophead", "CC-BY", "Mounts", "nema-17", "42.3 · 31 pitch"),
  tv(30139, "NEMA 14 face", "nophead", "CC-BY", "Mounts", "nema-14", "35.2 · 26 pitch"),
  tv(3002776, "GoPro style mount", "3DWinni", "CC-BY", "Mounts", "gopro", "two-prong"),
  tv(49000, "Fan 40 mm grill", "nophead", "CC-BY", "Mounts", "grill-40", "40 mm"),
  tv(49001, "Fan 80 mm grill", "nophead", "CC-BY", "Mounts", "grill-80", "80 mm"),
];

export function parseThingRef(raw: string): number | null {
  const m = raw.match(/thing[:/](\d{2,8})/i) || raw.match(/\b(\d{3,8})\b/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 100 ? n : null;
}

function scoreHit(h: ThingHit, q: string) {
  const hay = `${h.name} ${h.maker} ${h.tags} ${h.hint} ${h.twin} ${h.thingId ?? ""}`.toLowerCase();
  if (!q) return 1;
  if (hay.includes(q)) return 8;
  return q.split(/\s+/).filter(Boolean).reduce((n, w) => n + (hay.includes(w) ? 2 : 0), 0);
}

export function twinForQuery(q: string): string {
  const s = q.trim().toLowerCase().replace(/[/_.-]+/g, " ");
  if (!s) return "cube-20";
  const ranked = THINGIVERSE.map((h) => ({ h, n: scoreHit(h, s) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  if (ranked[0]?.h.twin && libById(ranked[0].h.twin)) return ranked[0].h.twin;
  const lib = libMatch(s);
  if (lib) return lib.id;
  return "cube-20";
}

export function searchThings(raw: string, tag?: string): ThingHit[] {
  const q = raw.trim().toLowerCase();
  const id = parseThingRef(raw);
  if (id) {
    const exact = THINGIVERSE.filter((h) => h.thingId === id);
    if (exact.length) return exact;
  }
  const tagged = tag ? THINGIVERSE.filter((h) => h.tags === tag) : THINGIVERSE;
  const hits = tagged
    .map((h) => ({ h, s: scoreHit(h, q) }))
    .filter((x) => !q || x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.h);
  if (q) {
    const lib = libMatch(q);
    if (lib) {
      const twin: ThingHit = {
        id: `pxd2-${lib.id}`,
        thingId: null,
        name: lib.name,
        maker: "PXD2",
        license: "parametric / open",
        tags: lib.group,
        url: "",
        twin: lib.id,
        source: "pxd2",
        hint: lib.hint,
      };
      if (!hits.some((h) => h.twin === lib.id)) hits.unshift(twin);
    }
  }
  return hits;
}

export function partFromThing(hit: ThingHit): Part {
  const item = (hit.twin && libById(hit.twin)) || libById(twinForQuery(hit.name)) || libById("cube-20");
  if (item) {
    const p = partFromLib(item);
    p.notes = [
      hit.thingId
        ? `Thingiverse ${hit.thingId} · ${hit.license} · ${hit.maker} · PXD2 solid ${item.id}`
        : `PXD2 ${item.id} · ${hit.license}`,
      ...p.notes,
    ];
    p.ask = hit.name;
    p.name = item.id;
    return p;
  }
  const p = defaultPart();
  p.name = hit.name.slice(0, 40);
  p.ask = hit.name;
  p.notes = [`Thingiverse ${hit.url} · ${hit.license}`];
  return p;
}

export function scadForThing(hit: ThingHit) {
  const item = (hit.twin && libById(hit.twin)) || libById(twinForQuery(hit.name));
  if (item) return item.scad;
  const p = partFromThing(hit);
  return `// pxd2 ${hit.name}
// ${hit.url}
w = ${p.width}; h = ${p.height}; t = ${p.thick};
cube([w, h, t], center = true);
`;
}
