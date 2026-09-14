import { FASTENERS, type Fit } from "@/lib/cad/fasteners";
import { instBox } from "@/lib/cad/assembly";
import { holeHits, laserLocks, lockAxes } from "@/lib/cad/laser";
import { fitPart } from "@/lib/cad/printer";
import { useCad } from "@/lib/cad/store";
import {
  decimals,
  fmtDims,
  fmtLen,
  fmtNum,
  fromDisplay,
  stepOf,
  toDisplay,
  UNIT_LABEL,
  type Unit,
} from "@/lib/cad/units";
import { Btn, Chip, Field, Label, UnitSwitch } from "./chrome";

const FITS: Fit[] = ["tap", "close", "normal", "loose"];

export function Inspector() {
  const part = useCad((s) => s.part);
  const unit = useCad((s) => s.unit);
  const setUnit = useCad((s) => s.setUnit);
  const setDims = useCad((s) => s.setDims);
  const fastener = useCad((s) => s.fastener);
  const pegSplit = useCad((s) => s.pegSplit);
  const patchHole = useCad((s) => s.patchHole);
  const addCornerHole = useCad((s) => s.addCornerHole);
  const dropHole = useCad((s) => s.dropHole);
  const nudgeTeeth = useCad((s) => s.nudgeTeeth);
  const compoundGears = useCad((s) => s.compoundGears);
  const fit = fitPart(part);
  const u = UNIT_LABEL[unit];

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-t border-border bg-surface p-3 md:w-72 md:border-l md:border-t-0">
      <div>
        <div className="flex items-center justify-between gap-2">
          <Label>Units</Label>
          <UnitSwitch value={unit} onChange={setUnit} />
        </div>
        {unit !== "mm" && (
          <p className="mt-1.5 font-mono text-xs text-faint">Kernel {fmtDims(part.width, part.height, part.thick, "mm")}</p>
        )}
        {part.solid?.kind && part.solid.kind !== "plate" && (
          <p className="mt-1 font-mono text-xs text-steel">
            {part.solid.kind}
            {part.solid.teeth ? ` · ${part.solid.teeth}T` : ""}
            {part.solid.teeth2 ? `/${part.solid.teeth2}T` : ""}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip onClick={() => nudgeTeeth(-2)}>− teeth</Chip>
          <Chip onClick={() => nudgeTeeth(2)}>+ teeth</Chip>
          <Chip onClick={() => compoundGears()}>Compound</Chip>
        </div>
      </div>

      <StackList />

      <div>
        <Label>Part · {u}</Label>
        <Field className="mt-1.5" value={part.name} onChange={(e) => setDims({ name: e.target.value })} />
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Num label="W" mm={part.width} unit={unit} onChangeMm={(n) => setDims({ width: n })} />
          <Num label="H" mm={part.height} unit={unit} onChangeMm={(n) => setDims({ height: n })} />
          <Num label="T" mm={part.thick} unit={unit} onChangeMm={(n) => setDims({ thick: n })} />
        </div>
      </div>

      <div>
        <Label>K2 Plus bed</Label>
        <p className={`mt-1.5 font-mono text-sm ${fit.fits ? "text-ok" : "text-warn"}`}>
          {fit.fits
            ? `Fits ${fmtNum(fit.usable[0], unit)} × ${fmtNum(fit.usable[1], unit)} × ${fmtNum(fit.usable[2], unit)} ${u} usable`
            : `Overflow ${fmtOverflow(fit.overflow, unit)}`}
        </p>
        {!fit.fits && (
          <Btn className="mt-2 w-full" kind="primary" onClick={pegSplit}>
            Peg-split for K2
          </Btn>
        )}
        {part.tiles && (
          <p className="mt-2 font-mono text-xs text-steel">
            {part.tiles.length} tiles · Ø{fmtLen(8, unit)} pegs @ {fmtLen(20, unit)}
          </p>
        )}
      </div>

      <div>
        <Label>Fastener</Label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {Object.keys(FASTENERS).map((k) => (
            <Chip key={k} onClick={() => fastener(k)}>
              {k.toUpperCase()}
            </Chip>
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {FITS.map((f) => (
            <Chip key={f} onClick={() => fastener(specOf(part.notes), f)}>
              {f}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label>Holes · {u}</Label>
          <button type="button" className="text-xs text-steel hover:text-fg" onClick={addCornerHole}>
            Add
          </button>
        </div>
        <ul className="mt-1.5 space-y-1.5">
          {part.holes.map((h, i) => (
            <li key={i} className="grid grid-cols-4 gap-1">
              <Mini mm={h.x} unit={unit} onChangeMm={(n) => patchHole(i, { x: n })} aria-label={`Hole ${i + 1} x`} />
              <Mini mm={h.y} unit={unit} onChangeMm={(n) => patchHole(i, { y: n })} aria-label={`Hole ${i + 1} y`} />
              <Mini mm={h.d} unit={unit} onChangeMm={(n) => patchHole(i, { d: n })} aria-label={`Hole ${i + 1} d`} />
              <button
                type="button"
                className="min-h-9 rounded-sm text-xs text-faint hover:bg-raised hover:text-bad"
                onClick={() => dropHole(i)}
              >
                Del
              </button>
            </li>
          ))}
        </ul>
      </div>

      {part.notes[0] && <p className="font-mono text-xs text-muted">{part.notes[0]}</p>}
    </aside>
  );
}

function Num({
  label,
  mm,
  unit,
  onChangeMm,
}: {
  label: string;
  mm: number;
  unit: Unit;
  onChangeMm: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-faint">{label}</span>
      <Field
        type="number"
        step={stepOf(unit)}
        value={toDisplay(mm, unit).toFixed(decimals(unit))}
        onChange={(e) => onChangeMm(fromDisplay(Number(e.target.value), unit, mm))}
        className="mt-0.5 font-mono"
      />
    </label>
  );
}

function Mini({
  mm,
  unit,
  onChangeMm,
  ...rest
}: {
  mm: number;
  unit: Unit;
  onChangeMm: (n: number) => void;
} & { "aria-label"?: string }) {
  return (
    <input
      type="number"
      step={stepOf(unit)}
      value={toDisplay(mm, unit).toFixed(decimals(unit))}
      onChange={(e) => onChangeMm(fromDisplay(Number(e.target.value), unit, mm))}
      className="min-h-9 w-full rounded-sm border border-border bg-raised px-1.5 font-mono text-xs text-fg outline-none focus:border-steel"
      {...rest}
    />
  );
}

function fmtOverflow(o: { x?: number; y?: number; z?: number }, unit: Unit) {
  return (["x", "y", "z"] as const)
    .filter((k) => o[k])
    .map((k) => `${k} +${fmtLen(o[k] ?? 0, unit)}`)
    .join(" ");
}

function specOf(notes: string[]) {
  return notes.join(" ").toLowerCase().match(/m(?:3|4|5|6|8|10|12)/)?.[0] || "m6";
}

function StackList() {
  const instances = useCad((s) => s.instances);
  const selId = useCad((s) => s.selId);
  const selectInst = useCad((s) => s.selectInst);
  const raiseInst = useCad((s) => s.raiseInst);
  const lowerInst = useCad((s) => s.lowerInst);
  const eraseInst = useCad((s) => s.eraseInst);
  const rotateSel = useCad((s) => s.rotateSel);
  const flipSel = useCad((s) => s.flipSel);
  const clearStack = useCad((s) => s.clearStack);
  const setInstVisible = useCad((s) => s.setInstVisible);
  const patchInst = useCad((s) => s.patchInst);
  const unit = useCad((s) => s.unit);
  const laserOn = useCad((s) => s.laserOn);
  const alignLasers = useCad((s) => s.alignLasers);
  const setLaserOn = useCad((s) => s.setLaserOn);
  const layers = instances.slice().reverse();
  const sel = instances.find((x) => x.id === selId) ?? null;
  const box = sel ? instBox(sel) : null;
  const locks = laserOn ? lockAxes(laserLocks(holeHits(instances)), selId) : [];

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Label>Stack</Label>
        {instances.length > 0 && (
          <Btn kind="quiet" onClick={clearStack}>
            Clear
          </Btn>
        )}
      </div>
      {instances.length === 0 ? (
        <p className="mt-1.5 text-sm text-muted">Stamp or stack the brush onto the bed. Layers pile like paint.</p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {layers.map((it, i) => (
            <li key={it.id} className="flex gap-1">
              <button
                type="button"
                onClick={() => selectInst(it.id)}
                className={`flex min-h-11 min-w-0 flex-1 items-center justify-between rounded-sm border px-2 text-left text-sm ${
                  it.id === selId ? "border-steel bg-raised text-fg" : "border-border text-muted hover:text-fg"
                } ${it.visible ? "" : "opacity-40"}`}
              >
                <span className="truncate font-mono text-xs text-faint">{layers.length - i}</span>
                <span className="min-w-0 flex-1 truncate px-2">{it.name}</span>
                <span className="font-mono text-xs text-faint">{Math.round(it.part.thick)}</span>
              </button>
              <button
                type="button"
                aria-label={it.visible ? `Hide ${it.name}` : `Show ${it.name}`}
                onClick={() => setInstVisible(it.id, !it.visible)}
                className="flex size-11 shrink-0 items-center justify-center rounded-sm border border-border text-xs text-muted hover:text-fg"
              >
                {it.visible ? "On" : "Off"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selId && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip onClick={raiseInst}>Raise</Chip>
          <Chip onClick={lowerInst}>Lower</Chip>
          <Chip onClick={() => rotateSel(90)}>Rot 90</Chip>
          <Chip onClick={() => flipSel(90)}>Flip</Chip>
          <Chip onClick={() => eraseInst()}>Erase</Chip>
          <Chip
            onClick={() => {
              const it = instances.find((x) => x.id === selId);
              if (it) setInstVisible(it.id, !it.visible);
            }}
          >
            Hide
          </Chip>
        </div>
      )}
      {sel && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-xs text-faint">X</span>
            <Field
              type="number"
              step={1}
              value={sel.x}
              onChange={(e) => patchInst(sel.id, { x: Number(e.target.value) })}
              className="mt-0.5 min-h-9 font-mono text-xs"
            />
          </label>
          <label className="block">
            <span className="text-xs text-faint">Z</span>
            <Field
              type="number"
              step={1}
              value={sel.z}
              onChange={(e) => patchInst(sel.id, { z: Number(e.target.value) })}
              className="mt-0.5 min-h-9 font-mono text-xs"
            />
          </label>
          <label className="block">
            <span className="text-xs text-faint">Y</span>
            <Field
              type="number"
              step={1}
              value={sel.y}
              onChange={(e) => patchInst(sel.id, { y: Number(e.target.value) })}
              className="mt-0.5 min-h-9 font-mono text-xs"
            />
          </label>
          <label className="block">
            <span className="text-xs text-faint">Rot</span>
            <Field
              type="number"
              step={15}
              value={sel.rot}
              onChange={(e) => patchInst(sel.id, { rot: Number(e.target.value) })}
              className="mt-0.5 min-h-9 font-mono text-xs"
            />
          </label>
          <label className="block">
            <span className="text-xs text-faint">Flip</span>
            <Field
              type="number"
              step={90}
              value={sel.flip ?? 0}
              onChange={(e) => patchInst(sel.id, { flip: Number(e.target.value) })}
              className="mt-0.5 min-h-9 font-mono text-xs"
            />
          </label>
        </div>
      )}
      {box && (
        <div className="mt-3">
          <Label>Measure</Label>
          <dl className="mt-1.5 grid grid-cols-1 gap-1 font-mono text-xs">
            <div className="flex justify-between gap-2 text-muted">
              <dt className="text-faint">Side X</dt>
              <dd className="text-fg">
                {fmtLen(box.spanX, unit)}
                <span className="text-faint">
                  {" "}
                  {fmtNum(box.minX, unit)}…{fmtNum(box.maxX, unit)}
                </span>
              </dd>
            </div>
            <div className="flex justify-between gap-2 text-muted">
              <dt className="text-faint">Side Z</dt>
              <dd className="text-fg">
                {fmtLen(box.spanZ, unit)}
                <span className="text-faint">
                  {" "}
                  {fmtNum(box.minZ, unit)}…{fmtNum(box.maxZ, unit)}
                </span>
              </dd>
            </div>
            <div className="flex justify-between gap-2 text-muted">
              <dt className="text-faint">Vert Y</dt>
              <dd className="text-fg">
                {fmtLen(box.spanY, unit)}
                <span className="text-faint">
                  {" "}
                  {fmtNum(box.minY, unit)}…{fmtNum(box.maxY, unit)}
                </span>
              </dd>
            </div>
          </dl>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip active={laserOn} onClick={() => setLaserOn(!laserOn)}>
              Laser
            </Chip>
            {laserOn && instances.length > 1 && <Chip onClick={alignLasers}>Align holes</Chip>}
          </div>
          {locks.length > 0 && (
            <p className="mt-1.5 font-mono text-xs text-steel">
              LOCK {locks.map((a) => a.toUpperCase()).join(" · ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

