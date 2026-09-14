export const FASTENERS: Record<string, { tap: number; close: number; normal: number; loose: number }> = {
  m3: { tap: 2.5, close: 3.2, normal: 3.4, loose: 3.6 },
  m4: { tap: 3.3, close: 4.3, normal: 4.5, loose: 4.8 },
  m5: { tap: 4.2, close: 5.3, normal: 5.5, loose: 5.8 },
  m6: { tap: 5.0, close: 6.4, normal: 6.6, loose: 7.0 },
  m8: { tap: 6.8, close: 8.4, normal: 9.0, loose: 10.0 },
  m10: { tap: 8.5, close: 10.5, normal: 11.0, loose: 12.0 },
  m12: { tap: 10.2, close: 13.0, normal: 13.5, loose: 14.5 },
};

export type Fit = "tap" | "close" | "normal" | "loose";

export function drill(spec: string, fit: Fit = "normal"): number | null {
  const key = spec.toLowerCase().replace(/\s+/g, "");
  const row = FASTENERS[key];
  return row ? row[fit] : null;
}
