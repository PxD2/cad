import { useEffect, useRef } from "react";
import {
  AmbientLight,
  AxesHelper,
  BoxGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  GridHelper,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Plane,
  Points,
  PointsMaterial,
  Raycaster,
  Scene,
  Sprite,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LAYER_COLORS, nearestInst, sitOffsetY } from "@/lib/cad/assembly";
import { importFile } from "@/lib/cad/io";
import { brushInst } from "@/lib/cad/laser";
import { laserView } from "@/lib/cad/laser-view";
import { bedRulers, selDims } from "@/lib/cad/measure-view";
import { meshGeometry, partGeometry } from "@/lib/cad/mesh";
import { K2_PLUS } from "@/lib/cad/printer";
import { transformedVerts, type ScanPly } from "@/lib/cad/scan";
import { useCad } from "@/lib/cad/store";
import type { Part } from "@/lib/cad/types";

export function Viewport({ part }: { part: Part }) {
  const host = useRef<HTMLDivElement>(null);
  const camSeq = useCad((s) => s.camSeq);
  const camOp = useCad((s) => s.camOp);
  const scans = useCad((s) => s.scans);
  const instances = useCad((s) => s.instances);
  const selId = useCad((s) => s.selId);
  const tool = useCad((s) => s.tool);
  const unit = useCad((s) => s.unit);
  const laserOn = useCad((s) => s.laserOn);
  const api = useRef<{
    controls: OrbitControls;
    camera: PerspectiveCamera;
    renderer: WebGLRenderer;
  } | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const scene = new Scene();
    scene.background = new Color(0x0b0c0e);
    const camera = new PerspectiveCamera(42, 1, 0.1, 8000);
    camera.position.set(140, 110, 160);
    const renderer = new WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    el.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);

    scene.add(new AmbientLight(0xb8c0c8, 0.55));
    const key = new DirectionalLight(0xf2f0ea, 1.15);
    key.position.set(80, 140, 60);
    scene.add(key);
    const fill = new DirectionalLight(0x7a8894, 0.4);
    fill.position.set(-60, 40, -80);
    scene.add(fill);
    scene.add(new GridHelper(400, 40, 0x2a2c31, 0x1a1c20));
    scene.add(bedWire());
    scene.add(bedRulers());
    const axes = new AxesHelper(28);
    axes.position.y = 0.4;
    scene.add(axes);

    const group = new Group();
    group.name = "part";
    scene.add(group);
    const assy = new Group();
    assy.name = "assy";
    scene.add(assy);
    const scan = new Group();
    scan.name = "scan";
    scene.add(scan);
    const dims = new Group();
    dims.name = "dims";
    scene.add(dims);
    const lasers = new Group();
    lasers.name = "lasers";
    scene.add(lasers);
    api.current = { controls, camera, renderer };
    (el as HTMLDivElement & { __scene?: Scene }).__scene = scene;

    const resize = () => {
      const w = el.clientWidth;
      const h = Math.max(1, el.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const later = window.setTimeout(resize, 80);

    const raycaster = new Raycaster();
    const ndc = new Vector2();
    const plane = new Plane(new Vector3(0, 1, 0), 0);
    const hit = new Vector3();
    const drag = { on: false, id: "", sx: 0, sy: 0 };

    const toNdc = (ev: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
    };
    const bedHit = () => (raycaster.ray.intersectPlane(plane, hit) ? hit : null);
    const meshHit = () => {
      const hits = raycaster.intersectObjects(assy.children, true);
      for (const h of hits) {
        let o = h.object;
        while (o && o !== assy) {
          if (typeof o.userData.instId === "string") return o.userData.instId as string;
          o = o.parent!;
        }
      }
      return null;
    };

    const onDown = (ev: PointerEvent) => {
      if (ev.button === 3 || ev.button === 4) {
        ev.preventDefault();
        toNdc(ev);
        const s = useCad.getState();
        const p = bedHit();
        const id = meshHit() || (p ? nearestInst(s.instances, p.x, p.z) : null) || s.selId;
        if (id) s.selectInst(id);
        if (ev.button === 3) s.flipSel(90);
        else s.rotateSel(90);
        return;
      }
      if (ev.button !== 0) return;
      toNdc(ev);
      const s = useCad.getState();
      drag.sx = ev.clientX;
      drag.sy = ev.clientY;
      const p = bedHit();
      const id = meshHit() || (p ? nearestInst(s.instances, p.x, p.z) : null) || (s.tool === "move" ? s.selId : null);
      const canDrag = s.tool === "move" || s.tool === "select";
      if (canDrag && id) {
        drag.on = true;
        drag.id = id;
        s.selectInst(id);
        s.setTool("move");
        controls.enabled = false;
        renderer.domElement.style.cursor = "grabbing";
        renderer.domElement.setPointerCapture(ev.pointerId);
      }
    };
    const onMove = (ev: PointerEvent) => {
      if (!drag.on) return;
      toNdc(ev);
      const p = bedHit();
      if (p) useCad.getState().moveInst(drag.id, p.x, p.z);
    };
    const onUp = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy);
      const wasDrag = drag.on;
      drag.on = false;
      controls.enabled = true;
      renderer.domElement.style.cursor = "";
      if (ev.button !== 0) return;
      if (wasDrag || dist > 7) return;
      toNdc(ev);
      const s = useCad.getState();
      const id = meshHit();
      const p = bedHit();
      if (s.tool === "erase") {
        if (id) s.eraseInst(id);
        return;
      }
      if (s.tool === "select" || s.tool === "move") {
        s.selectInst(id);
        return;
      }
      if (!p) return;
      if (s.tool === "stack") s.stackAt(p.x, p.z);
      else s.stampAt(p.x, p.z);
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;
      const step = ev.shiftKey ? 20 : 1;
      if (ev.key === "ArrowLeft") {
        ev.preventDefault();
        useCad.getState().nudgeInst(-step, 0);
      } else if (ev.key === "ArrowRight") {
        ev.preventDefault();
        useCad.getState().nudgeInst(step, 0);
      } else if (ev.key === "ArrowUp") {
        ev.preventDefault();
        useCad.getState().nudgeInst(0, -step);
      } else if (ev.key === "ArrowDown") {
        ev.preventDefault();
        useCad.getState().nudgeInst(0, step);
      } else if (ev.key === "PageUp") {
        ev.preventDefault();
        useCad.getState().liftInst(ev.shiftKey ? 20 : Math.max(useCad.getState().snap, 1));
      } else if (ev.key === "PageDown") {
        ev.preventDefault();
        useCad.getState().liftInst(-(ev.shiftKey ? 20 : Math.max(useCad.getState().snap, 1)));
      } else if (ev.key === "f" || ev.key === "F") {
        ev.preventDefault();
        useCad.getState().flipSel(90);
      } else if (ev.key === "r" || ev.key === "R") {
        ev.preventDefault();
        useCad.getState().rotateSel(90);
      } else if (ev.key === "l" || ev.key === "L") {
        ev.preventDefault();
        const cur = useCad.getState();
        cur.setLaserOn(!cur.laserOn);
      } else if (ev.key === "a" || ev.key === "A") {
        ev.preventDefault();
        useCad.getState().alignLasers();
      }
    };
    const onWheel = (ev: WheelEvent) => {
      if (ev.ctrlKey || ev.metaKey) return;
      const s = useCad.getState();
      const r = renderer.domElement.getBoundingClientRect();
      ndc.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const p = bedHit();
      const hover = meshHit() || (p ? nearestInst(s.instances, p.x, p.z) : null);
      const id = s.selId || hover;
      if (!id) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      if (s.selId !== id) s.selectInst(id);
      const unit = Math.max(s.snap, 1) * (ev.shiftKey ? 5 : 1);
      const dir = ev.deltaY < 0 ? 1 : ev.deltaY > 0 ? -1 : 0;
      if (dir) s.liftInst(dir * unit);
    };
    const swallowNav = (ev: MouseEvent) => {
      if (ev.button === 3 || ev.button === 4) ev.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", swallowNav, true);
    window.addEventListener("mouseup", swallowNav, true);
    window.addEventListener("auxclick", swallowNav, true);
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false, capture: true });

    let raf = 0;
    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(later);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("wheel", onWheel, { capture: true } as AddEventListenerOptions);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", swallowNav, true);
      window.removeEventListener("mouseup", swallowNav, true);
      window.removeEventListener("auxclick", swallowNav, true);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
      api.current = null;
    };
  }, []);

  useEffect(() => {
    const el = host.current as (HTMLDivElement & { __scene?: Scene }) | null;
    const scene = el?.__scene;
    if (!scene) return;
    const group = scene.getObjectByName("part") as Group | undefined;
    const assy = scene.getObjectByName("assy") as Group | undefined;
    const dims = scene.getObjectByName("dims") as Group | undefined;
    const lasers = scene.getObjectByName("lasers") as Group | undefined;
    if (!group || !assy) return;
    clearGroup(group);
    clearGroup(assy);
    if (dims) clearGroup(dims);
    if (lasers) clearGroup(lasers);
    const ghost = scans.some((p) => p.visible);
    if (instances.length === 0) {
      addPartMesh(group, part, 0xc5cdd4, ghost, false);
      if (laserOn && lasers) {
        const built = laserView([brushInst(part)], "brush", unit);
        while (built.children.length) lasers.add(built.children[0]);
      }
    } else {
      instances.forEach((it, i) => {
        if (!it.visible) return;
        const color = LAYER_COLORS[i % LAYER_COLORS.length];
        addPartMesh(assy, it.part, color, ghost, it.id === selId, it.x, it.y, it.z, it.rot, it.flip ?? 0, it.id);
      });
      const sel = instances.find((it) => it.id === selId);
      if (sel && dims) {
        const built = selDims(sel, unit);
        while (built.children.length) dims.add(built.children[0]);
      }
      if (laserOn && lasers) {
        const built = laserView(instances, selId, unit);
        while (built.children.length) lasers.add(built.children[0]);
      }
    }
  }, [part, scans, instances, selId, unit, laserOn]);

  useEffect(() => {
    const el = host.current as (HTMLDivElement & { __scene?: Scene }) | null;
    const scene = el?.__scene;
    if (!scene) return;
    const scan = scene.getObjectByName("scan") as Group | undefined;
    if (!scan) return;
    clearGroup(scan);
    for (const ply of scans) {
      if (!ply.visible || ply.verts.length < 3) continue;
      addPly(scan, ply);
    }
  }, [scans]);

  useEffect(() => {
    const a = api.current;
    if (!a || camSeq === 0) return;
    const { camera, controls } = a;
    const span = Math.max(part.width, part.height, part.thick, 50);
    const d = span * 2.15;
    if (camOp === "reset") {
      camera.position.set(d * 0.72, d * 0.55, d * 0.82);
      controls.target.set(0, part.thick / 2, 0);
    } else if (camOp === "zoomin") {
      camera.position.lerp(controls.target, 0.22);
    } else if (camOp === "zoomout") {
      const dir = camera.position.clone().sub(controls.target);
      camera.position.copy(controls.target).add(dir.multiplyScalar(1.28));
    } else {
      const sign = camOp === "rotcw" ? 1 : -1;
      const q = camera.position.clone().sub(controls.target);
      const ang = Math.atan2(q.z, q.x) + sign * 0.35;
      const r = Math.hypot(q.x, q.z);
      camera.position.set(
        controls.target.x + Math.cos(ang) * r,
        q.y + controls.target.y,
        controls.target.z + Math.sin(ang) * r,
      );
    }
    controls.update();
  }, [camSeq, camOp, part.width, part.height, part.thick]);

  return (
    <div
      ref={host}
      className={`h-full w-full min-h-48 touch-none bg-bg ${tool === "move" ? "cursor-grab" : tool === "erase" ? "cursor-not-allowed" : "cursor-crosshair"}`}
      data-tool={tool}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => {
        e.preventDefault();
        const lib =
          e.dataTransfer.getData("application/x-beni-lib") ||
          (e.dataTransfer.types.includes("Files") ? "" : e.dataTransfer.getData("text/plain"));
        if (lib) {
          useCad.getState().dropLib(lib);
          const s = useCad.getState();
          if (s.tool === "stack") s.stackAt();
          else s.stampAt();
          return;
        }
        const thingRaw = e.dataTransfer.getData("application/x-beni-thing");
        if (thingRaw) {
          try {
            const hit = JSON.parse(thingRaw);
            useCad.getState().stampThing(hit, useCad.getState().tool === "stack");
          } catch {
            /* ignore */
          }
          return;
        }
        if (e.dataTransfer.files.length) void ingestDropped(e.dataTransfer.files);
      }}
    />
  );
}

function addPartMesh(
  group: Group,
  part: Part,
  color: number,
  ghost: boolean,
  selected: boolean,
  x = 0,
  y = 0,
  z = 0,
  rot = 0,
  flip = 0,
  instId?: string,
) {
  try {
    const geo = partGeometry(part);
    const mesh = new Mesh(
      geo,
      new MeshStandardMaterial({
        color: selected ? 0xe8e6e0 : color,
        metalness: selected ? 0.35 : 0.55,
        roughness: selected ? 0.28 : 0.35,
        emissive: selected ? 0x3d4a55 : 0x000000,
        emissiveIntensity: selected ? 0.35 : 0,
        side: DoubleSide,
        transparent: ghost,
        opacity: ghost ? 0.32 : 1,
      }),
    );
    const edges = new LineSegments(
      new EdgesGeometry(geo, 28),
      new LineBasicMaterial({ color: selected ? 0x9aa7b4 : 0x1a1c20 }),
    );
    const wrap = new Group();
    wrap.position.set(x, y + sitOffsetY(part, flip), z);
    wrap.rotation.x = (flip * Math.PI) / 180;
    wrap.rotation.y = (rot * Math.PI) / 180;
    if (instId) wrap.userData.instId = instId;
    wrap.add(mesh, edges);
    group.add(wrap);
  } catch {
    /* keep empty rather than crash the studio */
  }
}

async function ingestDropped(files: FileList) {
  const { ingestScan, setPart, pushLog, cam } = useCad.getState();
  for (const file of Array.from(files)) {
    try {
      const hit = await importFile(file);
      if (hit.kind === "mesh" && hit.verts) ingestScan(hit.name, hit.verts);
      else if (hit.part) setPart(hit.part, hit.scad);
      pushLog(`${file.name}: ${hit.note}`);
      cam("reset");
    } catch (err) {
      pushLog(err instanceof Error ? err.message : "Drop failed");
    }
  }
}

function addPly(scan: Group, ply: ScanPly) {
  const verts = transformedVerts(ply);
  const geo = meshGeometry(verts);
  if (verts.length % 9 === 0 && verts.length / 9 < 60_000 && verts.length > 90) {
    scan.add(
      new Mesh(
        geo,
        new MeshStandardMaterial({
          color: ply.color,
          metalness: 0.15,
          roughness: 0.72,
          side: DoubleSide,
          transparent: true,
          opacity: 0.78,
        }),
      ),
    );
  } else {
    scan.add(new Points(geo, new PointsMaterial({ color: ply.color, size: 0.9, sizeAttenuation: true })));
  }
}

function clearGroup(group: Group) {
  while (group.children.length) {
    const ch = group.children[0];
    group.remove(ch);
    ch.traverse((o) => {
      if (o instanceof Mesh || o instanceof LineSegments || o instanceof Points || o instanceof Sprite) {
        if ("geometry" in o && o.geometry) o.geometry.dispose();
        const mat = o.material;
        const maps = Array.isArray(mat) ? mat : [mat];
        for (const m of maps) {
          const tex = (m as { map?: { dispose: () => void } }).map;
          if (tex) tex.dispose();
          m.dispose();
        }
      }
    });
  }
}

function bedWire() {
  const s = K2_PLUS.x;
  const g = new BoxGeometry(s, s, s);
  g.translate(0, s / 2, 0);
  return new LineSegments(
    new EdgesGeometry(g),
    new LineBasicMaterial({ color: 0x3d4a55, transparent: true, opacity: 0.45 }),
  );
}
