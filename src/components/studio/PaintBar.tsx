import { Crosshair, Eraser, Layers, Link2, MousePointer2, Move, Stamp } from "lucide-react";
import { SNAP_STEPS, type PaintTool } from "@/lib/cad/assembly";
import { BELT_PROFILE_LIST, BELT_PROFILES } from "@/lib/cad/belt";
import { useCad } from "@/lib/cad/store";
import { Btn, Chip } from "./chrome";

const TOOLS: { id: PaintTool; label: string; icon: typeof Stamp }[] = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "stamp", label: "Stamp", icon: Stamp },
  { id: "stack", label: "Stack", icon: Layers },
  { id: "move", label: "Move", icon: Move },
  { id: "belt", label: "Belt", icon: Link2 },
  { id: "erase", label: "Erase", icon: Eraser },
];

export function PaintBar() {
  const tool = useCad((s) => s.tool);
  const setTool = useCad((s) => s.setTool);
  const snap = useCad((s) => s.snap);
  const setSnap = useCad((s) => s.setSnap);
  const stampAt = useCad((s) => s.stampAt);
  const stackAt = useCad((s) => s.stackAt);
  const restack = useCad((s) => s.restack);
  const loadDemoStack = useCad((s) => s.loadDemoStack);
  const loadEasyBelt = useCad((s) => s.loadEasyBelt);
  const beltPair = useCad((s) => s.beltPair);
  const rotateSel = useCad((s) => s.rotateSel);
  const flipSel = useCad((s) => s.flipSel);
  const laserOn = useCad((s) => s.laserOn);
  const setLaserOn = useCad((s) => s.setLaserOn);
  const alignLasers = useCad((s) => s.alignLasers);
  const beltProfile = useCad((s) => s.beltProfile);
  const setBeltProfile = useCad((s) => s.setBeltProfile);
  const n = useCad((s) => s.instances.length);
  const belts = useCad((s) => s.belts.length);

  return (
    <div className="pointer-events-auto flex max-w-full flex-col gap-1.5">
      <div className="flex flex-wrap gap-1">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              aria-label={t.label}
              aria-pressed={tool === t.id}
              onClick={() => setTool(t.id)}
              className={`flex size-11 items-center justify-center rounded-sm border ${
                tool === t.id ? "border-steel bg-steel text-steel-fg" : "border-border bg-surface text-fg hover:bg-raised"
              }`}
            >
              <Icon className="size-4" strokeWidth={1.75} />
            </button>
          );
        })}
        <button
          type="button"
          aria-label="Laser level"
          aria-pressed={laserOn}
          onClick={() => setLaserOn(!laserOn)}
          className={`flex size-11 items-center justify-center rounded-sm border ${
            laserOn ? "border-steel bg-steel text-steel-fg" : "border-border bg-surface text-fg hover:bg-raised"
          }`}
        >
          <Crosshair className="size-4" strokeWidth={1.75} />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Btn kind="primary" onClick={() => (tool === "stack" ? stackAt() : tool === "belt" ? beltPair() : stampAt())}>
          {tool === "stack" ? "Stack brush" : tool === "belt" ? "Belt pair" : "Stamp brush"}
        </Btn>
        <Btn kind="ghost" onClick={loadEasyBelt}>
          Easy belt
        </Btn>
        <Btn kind="ghost" onClick={loadDemoStack}>
          Demo stack
        </Btn>
        {n > 1 && (
          <Btn kind="ghost" onClick={() => beltPair()}>
            Belt pair
          </Btn>
        )}
        {n > 0 && (
          <>
            <Btn kind="ghost" onClick={() => flipSel(90)}>
              Flip
            </Btn>
            <Btn kind="ghost" onClick={() => rotateSel(90)}>
              Rot 90
            </Btn>
            {laserOn && n > 1 && (
              <Btn kind="ghost" onClick={alignLasers}>
                Align holes
              </Btn>
            )}
          </>
        )}
        {n > 1 && (
          <Btn kind="quiet" onClick={restack}>
            Restack
          </Btn>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {SNAP_STEPS.map((step) => (
          <Chip key={step} active={snap === step} onClick={() => setSnap(step)}>
            {step === 0 ? "free" : step === 20 ? "peg 20" : `${step} mm`}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {BELT_PROFILE_LIST.map((id) => (
          <Chip key={id} active={beltProfile === id} onClick={() => setBeltProfile(id)}>
            {BELT_PROFILES[id].name}
          </Chip>
        ))}
        {belts > 0 && <span className="font-mono text-xs text-faint self-center">{belts} belt{belts === 1 ? "" : "s"}</span>}
      </div>
    </div>
  );
}