# PXD2 — CAD v1

Ask for a part. Reverse-engineering CAD that is meant to beat Fusion / SolidWorks
for a child-simple shop workflow: stamp, stack, **belt**, scan, laser-align, print.

**Helix CAD (current workstation):** [pxd2.github.io/cad2](https://pxd2.github.io/cad2/)  
**This app (v1 stamp/stack):** [pxd2.github.io/cad](https://pxd2.github.io/cad/)  
**Source:** [github.com/PxD2/cad](https://github.com/PxD2/cad)

The GitHub Pages host is the full program (Three.js tray, laser level, belt wraps,
Thingiverse twins, Generic Revo → STL). Kernel is millimeters. Display mm / cm / inches.
Bed is a Creality K2 Plus 350³.

Grok/shop AI calls need a server; on the public URL use **Local**. Stamp, stack,
lasers, belts, scan, and export all run in the browser.

## What it does

- **Ask** — type or speak a part. Local parser or Grok builds a real solid.
- **Every class of part** — gears (spur, helical, herringbone, bevel, worm, internal, planetary), GT2/HTD/MXL/V belts, pulleys, sprockets, shafts, T8, rails, wheels, servos, fans, 2020, fasteners, Gridfinity, electronics.
- **Motors** — tiny whoop 0603 through 5″ 2207, NEMA hybrid bodies, RS cans, N20/GA37 gearmotors, MY1020 e-bike cans, **Vevor 48V 3000 watt** (MY1020D Ø107 × 135 · Ø12 · T8F-11T), 10″/12″ 3000W hubs. Real solids, not lookalikes.
- **Stamp / stack / move** — layers on the bed like paint. Drag, arrows, scroll-wheel lift with magnet to nearby tops.
- **Easy belt** — click two pulleys (or **Easy belt**). A closed loop wraps them, snaps to whole teeth, and follows when you drag. GT2, GT3, HTD 3M/5M, T5, MXL, V-belt A. `B` is the belt tool.
- **Flip / rotate** — gamer-mouse side buttons (back = flip 90°, forward = rotate 90°), or F / R.
- **Laser level** — false 3-plane lasers through every hole (red X, green Y, cyan Z). Drag snaps to a nearby hole laser. **Align holes** squares the selected part onto the other part’s pattern. `L` toggles, `A` aligns.
- **Measure** — side-axis X / Z and vertical Y rulers on the bed, plus dimension brackets on the selected solid.
- **Thingiverse** — twins are actual solids (NEMA faces, GoPro, 608, pulley, belt…), not lookalike plates.
- **Generic Revopoint** — drop a scan, voxelize, stamp STL onto the tray.
- **Export** — STL, DXF, OpenSCAD, CadQuery, FreeCAD, Blender, JSON.

## Run locally

```bash
npm install
npm run dev
```

`npm run build:pages` emits the static host used at pxd2.github.io/cad.

## Voice

“easy belt”, “vevor 3000”, “stamp 2207”, “smallest drone motor”, “laser”, “align holes”, “flip”,
“rotate 90”, “thingiverse for nema 17”, “demo stack”, “use inches”.

## License

MIT. Chad Peters / PXD2 Soft Dev Group.
