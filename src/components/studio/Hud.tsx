import { CamPip } from "./CamPip";
import { PaintBar } from "./PaintBar";
import { Maximize2, RotateCcw, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import type { ReactNode } from "react";
import { instBox } from "@/lib/cad/assembly";
import { beltCaption, wrapBelt } from "@/lib/cad/belt";
import { brushInst, laserCaption } from "@/lib/cad/laser";
import { plyCount } from "@/lib/cad/scan";
import { useCad } from "@/lib/cad/store";
import { fmtDims, fmtLen, fmtNum } from "@/lib/cad/units";

export function Hud() {
  const cam = useCad((s) => s.cam);
  const part = useCad((s) => s.part);
  const unit = useCad((s) => s.unit);
  const scans = useCad((s) => s.scans);
  const instances = useCad((s) => s.instances);
  const selId = useCad((s) => s.selId);
  const n = instances.length;
  const tool = useCad((s) => s.tool);
  const laserOn = useCad((s) => s.laserOn);
  const belts = useCad((s) => s.belts);
  const vis = scans.filter((p) => p.visible);
  const pts = vis.reduce((sum, p) => sum + plyCount(p.verts), 0);
  const sel = instances.find((it) => it.id === selId) ?? null;
  const box = sel ? instBox(sel) : null;
  const laser = laserOn
    ? laserCaption(instances.length ? instances : [brushInst(part)], instances.length ? selId : "brush")
    : "";
  const belt = belts[0] ? wrapBelt(instances, belts[0]) : null;
  const beltText = belt ? beltCaption(belt) : "";
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3">
      <div className="pointer-events-none flex items-start justify-between">
        <div className="space-y-1">
          <div className="rounded-sm border border-border bg-bg/80 px-2 py-1 font-mono text-xs text-muted">
            {fmtDims(part.width, part.height, part.thick, unit)}
            {part.solid?.kind && part.solid.kind !== "plate" ? ` · ${part.solid.kind}` : ""}
            {n > 0 ? ` · ${n} layer${n === 1 ? "" : "s"}` : ""}
          </div>
          {box && (
            <div className="rounded-sm border border-border bg-bg/80 px-2 py-1 font-mono text-xs text-steel">
              X {fmtLen(box.spanX, unit)} · Z {fmtLen(box.spanZ, unit)} · Y {fmtNum(box.minY, unit)}–{fmtNum(box.maxY, unit)} {unit}
            </div>
          )}
          {laser && (
            <div className="rounded-sm border border-border bg-bg/80 px-2 py-1 font-mono text-xs text-steel">
              {laser}
            </div>
          )}
          {beltText && (
            <div className="rounded-sm border border-border bg-bg/80 px-2 py-1 font-mono text-xs text-steel">
              {beltText}
              {belts.length > 1 ? ` · +${belts.length - 1}` : ""}
            </div>
          )}
          {vis.length > 0 && (
            <div className="rounded-sm border border-border bg-bg/80 px-2 py-1 font-mono text-xs text-steel">
              {vis.length} ply{vis.length === 1 ? "" : "s"} · {pts} pts
            </div>
          )}
        </div>
        <div className="pointer-events-auto flex gap-1">
          <IconBtn label="Zoom in" onClick={() => cam("zoomin")}>
            <ZoomIn className="size-4" />
          </IconBtn>
          <IconBtn label="Zoom out" onClick={() => cam("zoomout")}>
            <ZoomOut className="size-4" />
          </IconBtn>
          <IconBtn label="Rotate left" onClick={() => cam("rotccw")}>
            <RotateCcw className="size-4" />
          </IconBtn>
          <IconBtn label="Rotate right" onClick={() => cam("rotcw")}>
            <RotateCw className="size-4" />
          </IconBtn>
          <IconBtn label="Reset view" onClick={() => cam("reset")}>
            <Maximize2 className="size-4" />
          </IconBtn>
        </div>
      </div>
      <div className="flex items-end justify-between gap-3">
        <PaintBar />
        <p className="hidden text-xs text-faint sm:block">
          {tool === "stamp" && "Click the bed to stamp the brush"}
          {tool === "stack" && "Click to stack on top"}
          {tool === "move" && "Drag · scroll lift · side btn flip / rot · L laser"}
          {tool === "erase" && "Click a layer to erase"}
          {tool === "select" && "Click a layer · L laser · A align holes · B belt"}
          {tool === "belt" && "Click pulley A, then pulley B — belt wraps and snaps to teeth"}
        </p>
      </div>
      <CamPip />
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-sm border border-border bg-surface text-fg hover:bg-raised"
    >
      {children}
    </button>
  );
}
