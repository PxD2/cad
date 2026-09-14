import { useRef, useState } from "react";
import { importFile } from "@/lib/cad/io";
import { PRESETS } from "@/lib/cad/presets";
import { scadFromPart } from "@/lib/cad/intent";
import { REVO_DEVICES } from "@/lib/cad/revo";
import { runGrokClean } from "@/lib/cad/run-clean";
import { plyCount, transformedVerts, type ScanPly } from "@/lib/cad/scan";
import { useCad } from "@/lib/cad/store";
import { Btn, Chip, Field, Label } from "./chrome";

export function FilesPanel() {
  const input = useRef<HTMLInputElement>(null);
  const setPart = useCad((s) => s.setPart);
  const pushLog = useCad((s) => s.pushLog);
  const cam = useCad((s) => s.cam);
  const scans = useCad((s) => s.scans);
  const patchScan = useCad((s) => s.patchScan);
  const removeScan = useCad((s) => s.removeScan);
  const alignScans = useCad((s) => s.alignScans);
  const mergeScans = useCad((s) => s.mergeScans);
  const cleanScansLocal = useCad((s) => s.cleanScansLocal);
  const loadDemoScans = useCad((s) => s.loadDemoScans);
  const cleaning = useCad((s) => s.cleaning);
  const revoId = useCad((s) => s.revoId);
  const setRevo = useCad((s) => s.setRevo);
  const stampScan = useCad((s) => s.stampScan);
  const exportScanStl = useCad((s) => s.exportScanStl);
  const ingestScan = useCad((s) => s.ingestScan);
  const device = REVO_DEVICES.find((d) => d.id === revoId) ?? REVO_DEVICES[0];
  const [hint, setHint] = useState(device.formats);

  const ingest = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      try {
        const hit = await importFile(file);
        if (hit.kind === "mesh" && hit.verts) ingestScan(hit.name, hit.verts);
        else if (hit.part) setPart(hit.part, hit.scad);
        pushLog(`${file.name}: ${hit.note}`);
        setHint(hit.note);
        cam("reset");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Import failed";
        pushLog(msg);
        setHint(msg);
      }
    }
  };

  const fusedVerts = () => scans.filter((p) => p.visible).flatMap((p) => transformedVerts(p));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
      <div>
        <h2 className="text-sm font-semibold text-fg">Revopoint</h2>
        <p className="mt-1 text-sm text-muted">
          {device.id === "generic"
            ? "Generic Revo Scan dump (PLY / OBJ / STL / ASC / XYZ) becomes a solid STL on the tray. Drag it."
            : `Drop a ${device.name} export. Clean the plies, then To STL or To tray and drag.`}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {REVO_DEVICES.map((d) => (
          <Chip key={d.id} active={revoId === d.id} onClick={() => setRevo(d.id)}>
            {d.name}
          </Chip>
        ))}
      </div>
      <p className="font-mono text-xs text-faint">
        {device.note} · voxel {device.voxel} mm
      </p>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length) void ingest(e.dataTransfer.files);
        }}
        className="flex min-h-24 flex-col items-center justify-center rounded-md border border-dashed border-border bg-bg px-3 text-center text-sm text-muted hover:border-steel hover:text-fg"
      >
        Drop {device.name} {device.id === "generic" ? "→ STL" : "scan"}
        <span className="mt-1 font-mono text-xs text-faint">{hint}</span>
      </button>
      <input
        ref={input}
        type="file"
        accept=".stl,.obj,.ply,.asc,.xyz,.scad,.json,.dxf"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void ingest(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Btn onClick={loadDemoScans}>Demo dual scan</Btn>
        <Btn onClick={alignScans} disabled={scans.filter((p) => p.visible).length < 2}>
          Auto-align
        </Btn>
        <Btn onClick={mergeScans} disabled={!scans.length}>
          Merge fill
        </Btn>
        <Btn onClick={() => cleanScansLocal(device.voxel, 1.4)} disabled={!scans.length}>
          Local clean
        </Btn>
        <Btn kind="primary" onClick={() => void runGrokClean()} disabled={!scans.length || cleaning}>
          {cleaning ? "Grok…" : "Grok clean"}
        </Btn>
        <Btn kind="primary" onClick={exportScanStl} disabled={!scans.length}>
          To STL
        </Btn>
        <Btn
          onClick={() => {
            const v = fusedVerts();
            if (v.length >= 9) stampScan(v, `${device.id}-scan`);
          }}
          disabled={!scans.length}
        >
          To tray
        </Btn>
      </div>
      {scans.length === 0 ? (
        <p className="text-sm text-faint">No plies yet. A dual-angle pair fills what one pass misses.</p>
      ) : (
        <ul className="space-y-2">
          {scans.map((p) => (
            <PlyCard key={p.id} ply={p} onPatch={patchScan} onRemove={removeScan} />
          ))}
        </ul>
      )}
      <Label>Shop presets</Label>
      <div className="grid grid-cols-1 gap-2">
        {PRESETS.map((p) => (
          <Btn
            key={p.id}
            className="h-auto min-h-12 justify-between"
            onClick={() => {
              setPart(p.part, scadFromPart(p.part));
              pushLog(`Preset ${p.label}`);
              cam("reset");
            }}
          >
            <span>{p.label}</span>
            <span className="text-xs font-normal text-faint">{p.hint}</span>
          </Btn>
        ))}
      </div>
    </div>
  );
}

function PlyCard({
  ply,
  onPatch,
  onRemove,
}: {
  ply: ScanPly;
  onPatch: (id: string, patch: Partial<ScanPly>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <li className="rounded-sm border border-border bg-raised p-2">
      <div className="flex items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: `#${ply.color.toString(16).padStart(6, "0")}` }} />
        <span className="min-w-0 flex-1 truncate text-sm text-fg">{ply.name}</span>
        <span className="font-mono text-xs text-faint">{plyCount(ply.verts)} pts</span>
        <button
          type="button"
          className="text-xs text-steel hover:text-fg"
          onClick={() => onPatch(ply.id, { visible: !ply.visible })}
        >
          {ply.visible ? "Hide" : "Show"}
        </button>
        <button type="button" className="text-xs text-faint hover:text-bad" onClick={() => onRemove(ply.id)}>
          Del
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Axis label="X" value={ply.offset[0]} onChange={(n) => onPatch(ply.id, { offset: [n, ply.offset[1], ply.offset[2]] })} />
        <Axis label="Y" value={ply.offset[1]} onChange={(n) => onPatch(ply.id, { offset: [ply.offset[0], n, ply.offset[2]] })} />
        <Axis label="Z" value={ply.offset[2]} onChange={(n) => onPatch(ply.id, { offset: [ply.offset[0], ply.offset[1], n] })} />
        <Axis label="Yaw" value={ply.rotZ} onChange={(n) => onPatch(ply.id, { rotZ: n })} />
      </div>
    </li>
  );
}

function Axis({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-faint">{label}</span>
      <Field
        type="number"
        step={0.2}
        value={value.toFixed(2)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-0.5 min-h-9 font-mono text-xs"
      />
    </label>
  );
}
