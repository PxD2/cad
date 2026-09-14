import { downloadPayload, type OutFmt } from "@/lib/cad/io";
import { useCad } from "@/lib/cad/store";
import { Btn, Label } from "./chrome";

const FORMATS: { id: OutFmt; label: string; hint: string }[] = [
  { id: "stl", label: "STL", hint: "Print mesh · Creality Print / Orca" },
  { id: "dxf", label: "DXF", hint: "2D profile · holes as circles" },
  { id: "scad", label: "OpenSCAD", hint: "Native script" },
  { id: "cq", label: "CadQuery", hint: "Python solid" },
  { id: "fc", label: "FreeCAD", hint: "Macro / console" },
  { id: "blend", label: "Blender", hint: "bpy boolean plate" },
  { id: "json", label: "JSON", hint: "Part card" },
  { id: "csv", label: "CSV", hint: "Hole table" },
];

export function ConvertPanel() {
  const part = useCad((s) => s.part);
  const scad = useCad((s) => s.scad);
  const pushLog = useCad((s) => s.pushLog);

  const run = (fmt: OutFmt) => {
    const name = downloadPayload(part, scad, fmt);
    pushLog(`Wrote ${name}`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
      <div>
        <h2 className="text-sm font-semibold text-fg">Converters</h2>
        <p className="mt-1 text-sm text-muted">
          Fusion .f3d and Inventor .ipt need their native kernels. PXD2 emits the dialects you can actually run:
          OpenSCAD, FreeCAD, Blender, CadQuery, STL, DXF.
        </p>
      </div>
      <Label>Download</Label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {FORMATS.map((f) => (
          <Btn key={f.id} className="h-auto min-h-14 flex-col items-start py-2" onClick={() => run(f.id)}>
            <span>{f.label}</span>
            <span className="text-xs font-normal text-faint">{f.hint}</span>
          </Btn>
        ))}
      </div>
    </div>
  );
}
