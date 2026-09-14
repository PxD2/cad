import type { Part } from "./types";

function f(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(3);
}

export function emitCadQuery(part: Part): string {
  const pts = part.holes.map((h) => `(${f(h.x)}, ${f(h.y)})`).join(", ");
  const d = part.holes[0]?.d ?? 6.6;
  return `import cadquery as cq

W, H, T = ${f(part.width)}, ${f(part.height)}, ${f(part.thick)}
HOLES = [${pts}]
D = ${f(d)}

part = (
    cq.Workplane("XY")
    .box(W, H, T)
    .faces(">Z").workplane()
    .pushPoints(HOLES)
    .hole(D)
)
# cq.exporters.export(part, "part.step")
`;
}

export function emitFreeCad(part: Part): string {
  const holes = part.holes
    .map(
      (h, i) =>
        `cyl${i} = Part.makeCylinder(${f(h.d / 2)}, ${f(part.thick + 2)}, App.Vector(${f(h.x)}, ${f(h.y)}, ${f(-part.thick / 2 - 1)}))`,
    )
    .join("\n");
  const cuts = part.holes.map((_, i) => `solid = solid.cut(cyl${i})`).join("\n");
  return `import FreeCAD as App
import Part
doc = App.newDocument("${part.name}")
solid = Part.makeBox(${f(part.width)}, ${f(part.height)}, ${f(part.thick)})
solid.translate(App.Vector(${f(-part.width / 2)}, ${f(-part.height / 2)}, ${f(-part.thick / 2)}))
${holes}
${cuts}
obj = doc.addObject("Part::Feature", "${part.name}")
obj.Shape = solid
doc.recompute()
`;
}

export function emitBlender(part: Part): string {
  return `import bpy
from mathutils import Vector

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)

bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
plate = bpy.context.active_object
plate.name = "${part.name}"
plate.scale = (${f(part.width / 2)}, ${f(part.height / 2)}, ${f(part.thick / 2)})
bpy.ops.object.transform_apply(scale=True)

holes = ${JSON.stringify(part.holes)}
for i, h in enumerate(holes):
    bpy.ops.mesh.primitive_cylinder_add(radius=h["d"]/2, depth=${f(part.thick)}+2, location=(h["x"], h["y"], 0))
    cutter = bpy.context.active_object
    mod = plate.modifiers.new(f"bool_{i}", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = cutter
    bpy.context.view_layer.objects.active = plate
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)
`;
}

export function emitDxf(part: Part): string {
  const lines: string[] = ["0", "SECTION", "2", "ENTITIES"];
  const hw = part.width / 2;
  const hh = part.height / 2;
  const rect = [
    [-hw, -hh, hw, -hh],
    [hw, -hh, hw, hh],
    [hw, hh, -hw, hh],
    [-hw, hh, -hw, -hh],
  ];
  for (const [x1, y1, x2, y2] of rect) {
    lines.push("0", "LINE", "8", "0", "10", f(x1), "20", f(y1), "11", f(x2), "21", f(y2));
  }
  for (const h of part.holes) {
    lines.push("0", "CIRCLE", "8", "0", "10", f(h.x), "20", f(h.y), "40", f(h.d / 2));
  }
  lines.push("0", "ENDSEC", "0", "EOF");
  return lines.join("\n");
}

export function downloadText(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
