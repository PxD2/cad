import type { FitReport, Part } from "./types";

export const K2_PLUS = {
  name: "Creality K2 Plus",
  x: 350,
  y: 350,
  z: 350,
  nozzle: 0.4,
  layer: 0.2,
  margin: 5,
};

export function usable() {
  return {
    x: K2_PLUS.x - 2 * K2_PLUS.margin,
    y: K2_PLUS.y - 2 * K2_PLUS.margin,
    z: K2_PLUS.z - K2_PLUS.margin,
  } as const;
}

export function fitPart(part: Part): FitReport {
  const u = usable();
  const w = part.width;
  const h = part.height;
  const t = part.thick;
  const overflow: FitReport["overflow"] = {};
  if (w > u.x) overflow.x = w - u.x;
  if (h > u.y) overflow.y = h - u.y;
  if (t > u.z) overflow.z = t - u.z;
  const scale = Math.min(u.x / w, u.y / h, u.z / t);
  return {
    printer: K2_PLUS.name,
    bed: [K2_PLUS.x, K2_PLUS.y, K2_PLUS.z],
    usable: [u.x, u.y, u.z],
    part: [w, h, t],
    fits: Object.keys(overflow).length === 0,
    overflow,
    scaleToFit: scale,
  };
}
