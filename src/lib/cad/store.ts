import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addHole, applyAsk, parseAsk, removeHole, scadFromPart, setFastener, updateHole, type Fit } from "./intent";
import { applyPegSplit } from "./pegs";
import { compileScad } from "./scad";
import { DEFAULT_SCAD, defaultPart, type Hole, type LogEntry, type Part, type Revision, type ScadPost } from "./types";
import { fmtDims, type Unit } from "./units";
import { libById, partFromLib } from "./library";
import { applySolid, makeCompound, nudgeTeeth as nudgeTeethPart, setKind, thicken as thickenPart } from "./tweak";
import type { SolidKind, SolidSpec } from "./solid-spec";
import {
  alignPlies,
  cleanCloud,
  mergePlies,
  newPlyId,
  PLY_COLORS,
  transformedVerts,
  type ScanPly,
} from "./scan";
import {
  hitStackY,
  liftY,
  bedHeights,
  flippedSize,
  lowerIn,
  makeInst,
  nextStampXZ,
  raiseIn,
  restackY,
  snapTo,
  wrapAngle,
  type Inst,
  type PaintTool,
} from "./assembly";
import { partFromThing, scadForThing, type ThingHit } from "./thingiverse";
import { bboxOf } from "./io";
import { asciiStl, downloadText, revoById, voxelSurface } from "./revo";
import { demoDualScan } from "./scan-synth";
import { alignToLasers, snapLiftToLasers, snapToLasers } from "./laser";
import {
  BELT_PROFILES,
  beltCaption,
  defaultBeltPair,
  inferProfile,
  isPulleyLike,
  makeBelt,
  samePulleySet,
  wrapBelt,
  type BeltLoop,
  type BeltProfileId,
} from "./belt";
import { kitById, KITS } from "./kits";

export type Tab = "model" | "voice" | "gesture" | "convert" | "files" | "library" | "iterate";
export type CamOp = "reset" | "zoomin" | "zoomout" | "rotcw" | "rotccw";
export type ImportMesh = { name: string; verts: number[] };

type DimPatch = Partial<Pick<Part, "width" | "height" | "thick" | "name">>;

type CadState = {
  scad: string;
  part: Part;
  log: LogEntry[];
  tab: Tab;
  unit: Unit;
  revisions: Revision[];
  posts: ScadPost[];
  scans: ScanPly[];
  cleaning: boolean;
  voiceOn: boolean;
  gestureOn: boolean;
  lastGesture: string;
  asking: boolean;
  reviewing: boolean;
  review: string;
  camSeq: number;
  camOp: CamOp;
  draft: string;
  importMesh: ImportMesh | null;
  setTab: (t: Tab) => void;
  setUnit: (u: Unit) => void;
  setDraft: (s: string) => void;
  pushLog: (text: string) => void;
  setScad: (s: string) => void;
  compile: () => void;
  applySentence: (text: string) => void;
  setPart: (p: Part, scad?: string) => void;
  setDims: (patch: DimPatch) => void;
  fastener: (spec: string, fit?: Fit) => void;
  pegSplit: () => void;
  snapshot: (note: string) => void;
  loadRevision: (id: string) => void;
  setVoice: (on: boolean) => void;
  setGesture: (on: boolean) => void;
  noteGesture: (g: string) => void;
  setAsking: (v: boolean) => void;
  setReviewing: (v: boolean) => void;
  setReview: (t: string) => void;
  cam: (op: CamOp) => void;
  setImportMesh: (m: ImportMesh | null) => void;
  patchHole: (i: number, patch: Partial<Hole>) => void;
  addCornerHole: () => void;
  dropHole: (i: number) => void;
  dropLib: (id: string) => void;
  postScad: (name?: string) => void;
  loadPost: (id: string) => void;
  dropPost: (id: string) => void;
  addScan: (name: string, verts: number[]) => void;
  patchScan: (id: string, patch: Partial<ScanPly>) => void;
  removeScan: (id: string) => void;
  alignScans: () => void;
  mergeScans: () => void;
  cleanScansLocal: (voxel?: number, stdMul?: number) => void;
  loadDemoScans: () => void;
  setCleaning: (v: boolean) => void;
  nudgeTeeth: (delta: number) => void;
  compoundGears: (teeth2?: number) => void;
  setSolidKind: (kind: SolidKind) => void;
  patchSolid: (solid: SolidSpec) => void;
  thicken: (delta: number) => void;
  instances: Inst[];
  selId: string | null;
  tool: PaintTool;
  snap: number;
  laserOn: boolean;
  setTool: (t: PaintTool) => void;
  setSnap: (n: number) => void;
  setLaserOn: (on: boolean) => void;
  selectInst: (id: string | null) => void;
  stampAt: (x?: number, z?: number) => void;
  stackAt: (x?: number, z?: number) => void;
  moveInst: (id: string, x: number, z: number) => void;
  liftInst: (dy: number) => void;
  rotateSel: (deg: number) => void;
  flipSel: (deg?: number) => void;
  raiseInst: () => void;
  lowerInst: () => void;
  eraseInst: (id?: string) => void;
  restack: () => void;
  clearStack: () => void;
  loadDemoStack: () => void;
  setInstVisible: (id: string, visible: boolean) => void;
  libSource: "beni" | "tv";
  thingsQuery: string;
  setLibSource: (s: "beni" | "tv") => void;
  setThingsQuery: (q: string) => void;
  loadThing: (hit: ThingHit) => void;
  stampThing: (hit: ThingHit, stack?: boolean) => void;
  revoId: string;
  setRevo: (id: string) => void;
  patchInst: (id: string, patch: Partial<Pick<Inst, "x" | "y" | "z" | "rot" | "flip">>) => void;
  nudgeInst: (dx: number, dz: number) => void;
  alignLasers: () => void;
  stampScan: (verts: number[], name: string) => void;
  exportScanStl: () => void;
  ingestScan: (name: string, verts: number[]) => void;
  belts: BeltLoop[];
  beltPick: string | null;
  beltProfile: BeltProfileId;
  setBeltProfile: (p: BeltProfileId) => void;
  clickBelt: (id: string) => void;
  beltPair: (a?: string | null, b?: string | null) => void;
  dropBelt: (id: string) => void;
  loadEasyBelt: () => void;
  loadKit: (id: string) => void;
};

export const useCad = create<CadState>()(
  persist(
    (set, get) => ({
      scad: DEFAULT_SCAD,
      part: defaultPart(),
      log: [{ t: Date.now(), text: "PXD2 ready. Stamp a part, belt two pulleys, or ask Grok." }],
      tab: "model",
      unit: "mm",
      revisions: [],
      posts: [],
      scans: [],
      cleaning: false,
      voiceOn: false,
      gestureOn: false,
      lastGesture: "",
      asking: false,
      reviewing: false,
      review: "",
      camSeq: 0,
      camOp: "reset",
      draft: "",
      importMesh: null,
      instances: [],
      selId: null,
      tool: "stamp",
      snap: 5,
      laserOn: true,
      belts: [],
      beltPick: null,
      beltProfile: "gt2",
      libSource: "beni",
      thingsQuery: "",
      revoId: "generic",
      setTab: (tab) => set({ tab }),
      setUnit: (unit) => {
        set({ unit });
        get().pushLog(`Units ${unit}`);
      },
      setDraft: (draft) => set({ draft }),
      pushLog: (text) => set((s) => ({ log: [...s.log.slice(-200), { t: Date.now(), text }] })),
      setScad: (scad) => set({ scad }),
      compile: () => {
        const part = compileScad(get().scad, get().part.name);
        set({ part });
        get().pushLog(`Compiled ${fmtDims(part.width, part.height, part.thick, get().unit)}${part.solid ? ` · ${part.solid.kind}` : ""}.`);
        get().cam("reset");
      },
      applySentence: (text) => {
        const ask = parseAsk(text, get().unit);
        const part = applyAsk(get().part, ask);
        set({ part, scad: scadFromPart(part) });
        get().pushLog(`Ask: ${text}`);
        get().cam("reset");
      },
      setPart: (part, scad) => set({ part, scad: scad && scad.trim() ? scad : scadFromPart(part) }),
      setDims: (patch) => {
        const part = { ...get().part, ...patch, tiles: null };
        set({ part, scad: part.solid ? get().scad : scadFromPart(part) });
      },
      fastener: (spec, fit = "normal") => {
        const part = setFastener(get().part, spec, fit);
        set({ part, scad: scadFromPart(part) });
        get().pushLog(`Fastener ${spec.toUpperCase()} ${fit}`);
      },
      pegSplit: () => {
        const part = applyPegSplit(get().part);
        set({ part });
        get().pushLog(part.tiles ? `Split into ${part.tiles.length} pegged tiles.` : "Fits the bed — no split.");
        get().cam("reset");
      },
      snapshot: (note) => {
        const part = get().part;
        const rev: Revision = {
          id: `r${String(get().revisions.length + 1).padStart(3, "0")}`,
          note,
          when: Date.now(),
          part,
          action: part.tiles ? "peg-split" : "single",
        };
        set((s) => ({ revisions: [...s.revisions, rev] }));
        get().pushLog(`Revision ${rev.id} saved.`);
      },
      loadRevision: (id) => {
        const rev = get().revisions.find((r) => r.id === id);
        if (!rev) return;
        set({ part: rev.part, scad: scadFromPart(rev.part) });
        get().pushLog(`Loaded ${id}`);
        get().cam("reset");
      },
      setVoice: (voiceOn) => set({ voiceOn }),
      setGesture: (gestureOn) => set({ gestureOn }),
      noteGesture: (lastGesture) => set({ lastGesture }),
      setAsking: (asking) => set({ asking }),
      setReviewing: (reviewing) => set({ reviewing }),
      setReview: (review) => set({ review }),
      cam: (camOp) => set((s) => ({ camOp, camSeq: s.camSeq + 1 })),
      setImportMesh: (importMesh) => set({ importMesh }),
      patchHole: (i, patch) => {
        const part = updateHole(get().part, i, patch);
        set({ part, scad: scadFromPart(part) });
      },
      addCornerHole: () => {
        const p = get().part;
        const hole = {
          x: Math.round((p.width * 0.35) / 2),
          y: Math.round((p.height * 0.35) / 2),
          d: p.holes[0]?.d ?? 6.6,
        };
        const part = addHole(p, hole);
        set({ part, scad: scadFromPart(part) });
      },
      dropHole: (i) => {
        const part = removeHole(get().part, i);
        set({ part, scad: scadFromPart(part) });
      },
      dropLib: (id) => {
        const item = libById(id);
        if (!item) return;
        const part = partFromLib(item);
        set({ part, scad: item.scad });
        get().pushLog(`Brush ${item.name}`);
      },
      postScad: (name) => {
        const scad = get().scad.trim();
        if (!scad) return;
        const post: ScadPost = {
          id: `s${Date.now().toString(36)}`,
          name: (name || get().part.name || "script").slice(0, 48),
          scad,
          when: Date.now(),
        };
        set((s) => ({ posts: [post, ...s.posts].slice(0, 24) }));
        get().pushLog(`Posted ${post.name} to the SCAD board.`);
      },
      loadPost: (id) => {
        const post = get().posts.find((p) => p.id === id);
        if (!post) return;
        set({ scad: post.scad, tab: "model" });
        get().compile();
        get().pushLog(`Loaded post ${post.name}`);
      },
      dropPost: (id) => set((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),
      addScan: (name, verts) => {
        if (verts.length < 9) return;
        const ply: ScanPly = {
          id: newPlyId(),
          name,
          verts,
          offset: [0, 0, get().scans.length * 0],
          rotZ: 0,
          visible: true,
          color: PLY_COLORS[get().scans.length % PLY_COLORS.length],
        };
        set((s) => ({ scans: [...s.scans, ply] }));
        get().pushLog(`Ply ${name} · ${Math.round(verts.length / 3)} pts`);
        get().cam("reset");
      },
      patchScan: (id, patch) =>
        set((s) => ({ scans: s.scans.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      removeScan: (id) => set((s) => ({ scans: s.scans.filter((p) => p.id !== id) })),
      alignScans: () => {
        const next = alignPlies(get().scans);
        set({ scans: next });
        get().pushLog(`Aligned ${next.filter((p) => p.visible).length} plies on the tray.`);
        get().cam("reset");
      },
      mergeScans: () => {
        const fused = mergePlies(get().scans);
        if (fused.length < 9) return;
        const cleaned = voxelDownsampleSafe(fused);
        set({
          scans: [
            {
              id: newPlyId(),
              name: "fused",
              verts: cleaned,
              offset: [0, 0, 0],
              rotZ: 0,
              visible: true,
              color: PLY_COLORS[0],
            },
          ],
        });
        get().pushLog(`Fused ${Math.round(cleaned.length / 3)} pts · gaps filled from overlap.`);
        get().cam("reset");
      },
      cleanScansLocal: (voxel = 0.8, stdMul = 1.4) => {
        set((s) => ({
          scans: s.scans.map((p) =>
            p.visible ? { ...p, verts: cleanCloud(p.verts, voxel, stdMul, true) } : p,
          ),
        }));
        get().pushLog(`Local clean voxel ${voxel} · k-dist ×${stdMul}`);
      },
      loadDemoScans: () => {
        const plies = demoDualScan();
        set({ scans: plies, tab: "files" });
        get().pushLog("Demo dual scan on the tray — align, then Grok clean.");
        get().cam("reset");
        if (get().revoId === "generic") {
          const verts = plies.filter((p) => p.visible).flatMap((p) => transformedVerts(p));
          if (verts.length >= 9) get().stampScan(verts, "generic-scan");
        }
      },
      setCleaning: (cleaning) => set({ cleaning }),
      nudgeTeeth: (delta) => {
        const hit = nudgeTeethPart(get().part, delta);
        set({ part: hit.part, scad: hit.scad || get().scad });
        get().pushLog(`Teeth ${hit.part.solid?.teeth ?? "?"}`);
        get().cam("reset");
      },
      compoundGears: (teeth2) => {
        const hit = makeCompound(get().part, teeth2);
        set({ part: hit.part, scad: hit.scad });
        get().pushLog(`Compound ${hit.part.solid?.teeth}/${hit.part.solid?.teeth2}T`);
        get().cam("reset");
      },
      setSolidKind: (kind) => {
        const hit = setKind(get().part, kind);
        set({ part: hit.part, scad: hit.scad });
        get().pushLog(`Kind ${kind}`);
        get().cam("reset");
      },
      patchSolid: (solid) => {
        const hit = applySolid(get().part, solid);
        set({ part: hit.part, scad: hit.scad });
        get().cam("reset");
      },
      thicken: (delta) => {
        const hit = thickenPart(get().part, delta);
        set({ part: hit.part, scad: hit.scad || get().scad });
        get().pushLog(`Thickness ${hit.part.thick}`);
      },
      setTool: (tool) => set({ tool, beltPick: tool === "belt" ? get().beltPick : null }),
      setSnap: (snap) => set({ snap }),
      setLaserOn: (laserOn) => {
        set({ laserOn });
        get().pushLog(laserOn ? "Laser level on" : "Laser level off");
      },
      selectInst: (selId) => set({ selId }),
      stampAt: (x, z) => {
        const s = get();
        const pos = x == null || z == null ? nextStampXZ(s.instances, s.snap) : { x: snapTo(x, s.snap), z: snapTo(z, s.snap) };
        const inst = makeInst(s.part, pos.x, 0, pos.z);
        set({ instances: [...s.instances, inst].slice(-48), selId: inst.id, tool: "move" });
        s.pushLog(`Stamp ${inst.name} @ ${inst.x},${inst.z} — drag to move`);
      },
      stackAt: (x, z) => {
        const s = get();
        const px = x == null ? s.instances.find((i) => i.id === s.selId)?.x ?? 0 : snapTo(x, s.snap);
        const pz = z == null ? s.instances.find((i) => i.id === s.selId)?.z ?? 0 : snapTo(z, s.snap);
        const y = hitStackY(s.instances, px, pz);
        const inst = makeInst(s.part, px, y, pz);
        set({ instances: [...s.instances, inst].slice(-48), selId: inst.id, tool: "stack" });
        s.pushLog(`Stack ${inst.name} at ${y.toFixed(1)} mm`);
      },
      moveInst: (id, x, z) => {
        const s = get();
        let nx = snapTo(x, s.snap);
        let nz = snapTo(z, s.snap);
        const moving = s.instances.find((it) => it.id === id);
        if (s.laserOn && moving) {
          const hit = snapToLasers(
            { ...moving, x: nx, z: nz },
            s.instances.filter((it) => it.id !== id && it.visible),
            nx,
            nz,
            s.snap,
          );
          nx = hit.x;
          nz = hit.z;
        }
        set({
          instances: s.instances.map((it) => (it.id === id ? { ...it, x: nx, z: nz } : it)),
        });
      },
      liftInst: (dy) => {
        const s = get();
        const id = s.selId;
        if (!id || !dy) return;
        const beds = bedHeights(s.instances, id);
        set({
          instances: s.instances.map((it) => {
            if (it.id !== id) return it;
            const max = Math.max(0, 350 - flippedSize(it.part, it.flip).h);
            let y = liftY(it.y + dy, s.snap, beds, max);
            if (s.laserOn) {
              y = snapLiftToLasers(
                { ...it, y },
                s.instances.filter((o) => o.id !== id && o.visible),
                y,
                s.snap,
              );
              y = Math.max(0, Math.min(max, y));
            }
            return { ...it, y };
          }),
        });
      },
      rotateSel: (deg) => {
        const id = get().selId;
        if (!id) return;
        set({
          instances: get().instances.map((it) => (it.id === id ? { ...it, rot: wrapAngle(it.rot + deg) } : it)),
        });
        get().pushLog(`Rotate ${wrapAngle((get().instances.find((x) => x.id === id)?.rot ?? 0))}°`);
      },
      flipSel: (deg = 90) => {
        const id = get().selId;
        if (!id) return;
        set({
          instances: get().instances.map((it) =>
            it.id === id ? { ...it, flip: wrapAngle((it.flip ?? 0) + deg) } : it,
          ),
        });
        get().pushLog(`Flip ${wrapAngle(get().instances.find((x) => x.id === id)?.flip ?? 0)}°`);
      },
      raiseInst: () => {
        const id = get().selId;
        if (!id) return;
        set({ instances: raiseIn(get().instances, id) });
        get().pushLog("Raise layer");
      },
      lowerInst: () => {
        const id = get().selId;
        if (!id) return;
        set({ instances: lowerIn(get().instances, id) });
        get().pushLog("Lower layer");
      },
      eraseInst: (id) => {
        const kill = id || get().selId;
        if (!kill) return;
        const instances = get().instances.filter((it) => it.id !== kill);
        const belts = get().belts.filter((b) => b.id !== kill && !b.pulleyIds.includes(kill));
        set({
          instances,
          belts,
          selId: instances.at(-1)?.id ?? null,
          beltPick: get().beltPick === kill ? null : get().beltPick,
        });
        get().pushLog("Erased layer");
      },
      restack: () => {
        set({ instances: restackY(get().instances) });
        get().pushLog("Restacked");
      },
      clearStack: () => set({ instances: [], selId: null, belts: [], beltPick: null }),
      loadDemoStack: () => {
        const plate = defaultPart();
        const gear = libById("spur-m2-20");
        const brg = libById("brg-608");
        const so = libById("so-m3-12");
        const layers: Inst[] = [makeInst(plate, 0, 0, 0)];
        if (gear) layers.push(makeInst(partFromLib(gear), 0, plate.thick, 0));
        if (brg) layers.push(makeInst(partFromLib(brg), 0, plate.thick + 8, 0));
        if (so) layers.push(makeInst(partFromLib(so), 25, plate.thick, -15));
        set({ instances: layers, selId: layers[0]?.id ?? null, tool: "select", tab: "model" });
        get().pushLog(`Demo stack · ${layers.length} layers`);
        get().cam("reset");
      },
      setInstVisible: (id, visible) =>
        set({ instances: get().instances.map((it) => (it.id === id ? { ...it, visible } : it)) }),
      setLibSource: (libSource) => set({ libSource, tab: "library" }),
      setThingsQuery: (thingsQuery) => set({ thingsQuery }),
      loadThing: (hit) => {
        const part = partFromThing(hit);
        set({ part, scad: scadForThing(hit) });
        get().pushLog(`Brush ${hit.name} · ${hit.source}`);
      },
      stampThing: (hit, stack = false) => {
        get().loadThing(hit);
        if (stack) get().stackAt();
        else get().stampAt();
      },
      setRevo: (revoId) => {
        set({ revoId });
        get().pushLog(`Scanner ${revoById(revoId).name}`);
      },
      patchInst: (id, patch) => {
        set({
          instances: get().instances.map((it) => (it.id === id ? { ...it, ...patch } : it)),
        });
      },
      nudgeInst: (dx, dz) => {
        const id = get().selId;
        if (!id) return;
        const it = get().instances.find((x) => x.id === id);
        if (!it) return;
        get().moveInst(id, it.x + dx, it.z + dz);
      },
      alignLasers: () => {
        const s = get();
        const id = s.selId;
        if (!id) return;
        const moving = s.instances.find((it) => it.id === id);
        if (!moving) return;
        const others = s.instances.filter((it) => it.id !== id && it.visible);
        if (!others.length) {
          s.pushLog("Stamp another layer to align holes");
          return;
        }
        const hit = alignToLasers(moving, others);
        set({
          instances: s.instances.map((it) => (it.id === id ? { ...it, x: hit.x, z: hit.z } : it)),
        });
        s.pushLog(`Align holes → ${hit.x.toFixed(1)}, ${hit.z.toFixed(1)}`);
      },
      stampScan: (verts, name) => {
        if (verts.length < 9) return;
        const device = revoById(get().revoId);
        const tri = voxelSurface(verts, device.voxel);
        const soup = tri.length >= 9 ? tri : verts;
        const b = bboxOf(soup);
        const part = {
          name,
          width: b.w,
          height: b.h,
          thick: b.t,
          holes: [],
          tiles: null,
          ask: name,
          notes: [`${device.name} · ${device.note}`],
          solid: null,
          mesh: soup,
        };
        const inst = makeInst(part, 0, 0, 0);
        set({
          part,
          instances: [...get().instances, inst].slice(-48),
          selId: inst.id,
          tool: "move",
          tab: "files",
        });
        get().pushLog(`Tray ${name} · ${Math.round(soup.length / 9)} tris · move it`);
        get().cam("reset");
      },
      exportScanStl: () => {
        const vis = get().scans.filter((p) => p.visible);
        const verts = vis.flatMap((p) => transformedVerts(p));
        if (verts.length < 9) return;
        const device = revoById(get().revoId);
        const tri = voxelSurface(verts, device.voxel);
        const name = `pxd2-${device.id}`;
        downloadText(`${name}.stl`, asciiStl(tri, name));
        get().pushLog(`STL ${name} · ${Math.round(tri.length / 9)} tris`);
      },
      ingestScan: (name, verts) => {
        if (verts.length < 9) return;
        get().addScan(name, verts);
        const device = revoById(get().revoId);
        if (device.id === "generic") {
          get().stampScan(verts, name.replace(/\.[^.]+$/, "") || "revo-scan");
        }
      },
      setBeltProfile: (beltProfile) => {
        set({ beltProfile });
        get().pushLog(`${BELT_PROFILES[beltProfile].name} belt`);
      },
      clickBelt: (id) => {
        const s = get();
        const it = s.instances.find((x) => x.id === id);
        if (!it || !isPulleyLike(it.part)) {
          s.pushLog("Belt needs a pulley, gear, idler, or wheel");
          return;
        }
        if (!s.beltPick || s.beltPick === id) {
          set({ beltPick: id, selId: id });
          s.pushLog("Belt: click the other pulley");
          return;
        }
        get().beltPair(s.beltPick, id);
        set({ beltPick: null, tool: "select" });
      },
      beltPair: (a, b) => {
        const s = get();
        const pair = defaultBeltPair(s.instances, a ?? s.selId, b ?? null);
        if (!pair) {
          s.pushLog("Stamp two pulleys, then belt them");
          return;
        }
        if (s.belts.some((x) => samePulleySet(x.pulleyIds, pair))) {
          s.pushLog("Already belted");
          return;
        }
        const parts = pair
          .map((id) => s.instances.find((it) => it.id === id)?.part)
          .filter((p): p is NonNullable<typeof p> => !!p);
        const profile = parts.some((p) => p.solid?.pitch === 5) ? "htd5" : inferProfile(parts);
        const width = Math.min(
          BELT_PROFILES[profile].width,
          Math.max(4, Math.min(...parts.map((p) => p.thick || 8)) - 1),
        );
        const belt = makeBelt(pair, s.beltProfile || profile, width);
        if (profile !== s.beltProfile && s.beltProfile === "gt2") belt.profile = profile;
        const path = wrapBelt(s.instances, belt);
        if (!path.ok) {
          s.pushLog(path.note || "Can't wrap that pair");
          return;
        }
        set({ belts: [...s.belts, belt].slice(-16), selId: pair[0], tool: "select", beltPick: null });
        get().pushLog(`Belt ${beltCaption(path)}`);
      },
      dropBelt: (id) => {
        set({ belts: get().belts.filter((b) => b.id !== id) });
        get().pushLog("Belt off");
      },
      loadEasyBelt: () => get().loadKit("gt2-drive"),
      loadKit: (id) => {
        const kit = kitById(id) || KITS.find((k) => k.id.includes(id) || k.name.toLowerCase().includes(id.toLowerCase()));
        if (!kit) {
          get().pushLog(`No kit ${id}`);
          return;
        }
        const built = kit.build();
        set({
          instances: built.instances,
          belts: built.belts,
          selId: built.instances[0]?.id ?? null,
          tool: "move",
          tab: "model",
          beltPick: null,
        });
        if (built.instances[0]) set({ part: built.instances[0].part });
        get().pushLog(`${kit.name} · ${built.instances.length} parts${built.belts.length ? ` · ${built.belts.length} belt` : ""}`);
        get().cam("reset");
      },
    }),
    {
      name: "pxd2-cad",
      partialize: (s) => ({
        scad: s.scad,
        part: s.part,
        revisions: s.revisions,
        unit: s.unit,
        posts: s.posts,
        instances: s.instances.map((it) => ({
          ...it,
          part: { ...it.part, mesh: undefined },
        })),
        tool: s.tool,
        snap: s.snap,
        laserOn: s.laserOn,
        revoId: s.revoId,
        belts: s.belts,
        beltProfile: s.beltProfile,
      }),
    },
  ),
);

function voxelDownsampleSafe(verts: number[]) {
  try {
    return cleanCloud(verts, 0.9, 1.5, true);
  } catch {
    return verts;
  }
}
