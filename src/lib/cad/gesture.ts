/** Port of the desktop MediaPipe gesture classifier — normalized 0..1 landmarks. */

export type Landmark = { x: number; y: number; z?: number };
export type Gesture = "pinch" | "fist" | "open_palm" | "v_sign";

const I = {
  thumbTip: 4,
  indexTip: 8,
  indexPip: 6,
  middleTip: 12,
  middlePip: 10,
  ringTip: 16,
  ringPip: 14,
  pinkyTip: 20,
  pinkyPip: 18,
} as const;

function dist(a: Landmark, b: Landmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function extended(lm: Landmark[], tip: number, pip: number, thresh = 0.08) {
  return dist(lm[tip], lm[pip]) > thresh;
}

function folded(lm: Landmark[], tip: number, pip: number, thresh = 0.05) {
  return dist(lm[tip], lm[pip]) < thresh;
}

export function detectGesture(lm: Landmark[]): Gesture | null {
  if (lm.length < 21) return null;
  if (dist(lm[I.thumbTip], lm[I.indexTip]) < 0.045) return "pinch";

  const foldCount = [I.middleTip, I.ringTip, I.pinkyTip].filter((tip, i) =>
    folded(lm, tip, [I.middlePip, I.ringPip, I.pinkyPip][i]),
  ).length;
  if (foldCount >= 2 && !extended(lm, I.indexTip, I.indexPip)) return "fist";

  const nExt = [
    [I.indexTip, I.indexPip],
    [I.middleTip, I.middlePip],
    [I.ringTip, I.ringPip],
    [I.pinkyTip, I.pinkyPip],
  ].filter(([tip, pip]) => extended(lm, tip, pip)).length;
  if (nExt >= 4) return "open_palm";

  if (
    extended(lm, I.indexTip, I.indexPip) &&
    extended(lm, I.middleTip, I.middlePip) &&
    folded(lm, I.ringTip, I.ringPip) &&
    folded(lm, I.pinkyTip, I.pinkyPip)
  ) {
    return "v_sign";
  }
  return null;
}

export const GESTURE_HELP: Record<Gesture, string> = {
  pinch: "Zoom in",
  fist: "Rotate clockwise",
  open_palm: "Reset view",
  v_sign: "Zoom out",
};
