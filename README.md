# PXD2

Ask for a part. Reverse-engineering CAD that is meant to beat Fusion / SolidWorks
for a child-simple shop workflow: stamp, stack, scan, laser-align, print.

Kernel is millimeters. Display units are mm / cm / inches. Bed is a Creality
K2 Plus 350³.

## What it does

- **Ask** — type or speak a part. Local parser or Grok builds a real solid.
- **Stamp / stack / move** — layers on the bed like paint. Drag, arrows, scroll-wheel lift with magnet to nearby tops.
- **Flip / rotate** — gamer-mouse side buttons (back = flip 90°, forward = rotate 90°), or F / R.
- **Laser level** — false 3-plane lasers through every hole (red X, green Y, cyan Z). Drag snaps to a nearby hole laser. **Align holes** squares the selected part onto the other part’s pattern. `L` toggles, `A` aligns.
- **Measure** — side-axis X / Z and vertical Y rulers on the bed, plus dimension brackets on the selected solid.
- **Thingiverse** — twins are actual solids (NEMA faces, GoPro, 608, pulley…), not lookalike plates.
- **Generic Revopoint** — drop a scan, voxelize, stamp STL onto the tray.
- **Export** — STL, DXF, OpenSCAD, CadQuery, FreeCAD, Blender, JSON.

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints. `npm test` runs the CAD kernel tests (units, library,
assembly, Thingiverse twins, laser level).

## Voice

“stamp”, “stack”, “laser”, “align holes”, “flip”, “rotate 90”, “thingiverse for
nema 17”, “demo stack”, “use inches”.

## License

MIT. Chad Peters / PXD2 Soft Dev Group.
