import { partFromSolid, scadFromSolid } from "./library.ts";
import { envelopeOf, isGearKind, type SolidKind, type SolidSpec } from "./solid-spec.ts";
import type { Part } from "./types";

export function applySolid(part: Part, solid: SolidSpec): { part: Part; scad: string } {
  const next = partFromSolid(solid, part.name || solid.kind);
  next.ask = part.ask;
  next.notes = part.notes;
  return { part: next, scad: scadFromSolid(solid, next.name) };
}

export function currentSolid(part: Part): SolidSpec {
  if (part.solid && part.solid.kind && part.solid.kind !== "plate") return { ...part.solid };
  return { kind: "spur", teeth: 20, module: 2, bore: 5, t: part.thick || 8 };
}

export function nudgeTeeth(part: Part, delta: number): { part: Part; scad: string } {
  const s = currentSolid(part);
  if (!isGearKind(s.kind) && s.kind !== "worm") s.kind = "spur";
  const z = Math.max(8, Math.min(120, (s.teeth ?? 20) + delta));
  return applySolid(part, { ...s, teeth: z });
}

export function setTeeth(part: Part, teeth: number): { part: Part; scad: string } {
  return nudgeTeeth(part, teeth - (currentSolid(part).teeth ?? 20));
}

export function makeCompound(part: Part, teeth2?: number): { part: Part; scad: string } {
  const s = currentSolid(part);
  const z1 = s.teeth ?? 20;
  const z2 = teeth2 && teeth2 > z1 ? teeth2 : z1 * 2;
  return applySolid(part, {
    kind: "compound",
    teeth: z1,
    teeth2: z2,
    module: s.module ?? 2,
    bore: s.bore ?? 5,
    t: Math.max(14, (s.t ?? 8) * 2),
  });
}

export function setKind(part: Part, kind: SolidKind): { part: Part; scad: string } {
  const s = currentSolid(part);
  return applySolid(part, { ...s, kind });
}

export function thicken(part: Part, delta: number): { part: Part; scad: string } {
  if (part.solid && part.solid.kind && part.solid.kind !== "plate") {
    const s = { ...part.solid };
    const t = Math.max(1, (s.t ?? s.height ?? s.width ?? part.thick) + delta);
    if (s.t != null || s.kind === "spur" || s.kind === "herringbone" || s.kind === "compound" || s.kind === "pulley") s.t = t;
    else if (s.height != null) s.height = t;
    else if (s.length != null) s.length = t;
    else s.t = t;
    return applySolid(part, s);
  }
  const thick = Math.max(0.8, part.thick + delta);
  const next = { ...part, thick, tiles: null };
  return { part: next, scad: "" };
}

export function envelopePart(part: Part): Part {
  if (!part.solid) return part;
  const env = envelopeOf(part.solid);
  return { ...part, width: env.width, height: env.height, thick: env.thick };
}
