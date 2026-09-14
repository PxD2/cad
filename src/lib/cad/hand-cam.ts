import { detectGesture, type Gesture, type Landmark } from "./gesture";

export type CamStatus = "off" | "starting" | "live" | "blocked" | "missing";

type MpHands = {
  close: () => void;
  send: (src: { image: HTMLVideoElement }) => Promise<void>;
  setOptions: (o: Record<string, unknown>) => void;
  onResults: (cb: (r: { multiHandLandmarks?: Landmark[][] }) => void) => void;
};

type MpModule = {
  Hands: new (opts: { locateFile: (f: string) => string }) => MpHands;
};

let stream: MediaStream | null = null;
let status: CamStatus = "off";
let err = "";
let hidden: HTMLVideoElement | null = null;
let hands: MpHands | null = null;
let raf = 0;
let lastG = 0;
let gestureCb: ((g: Gesture) => void) | null = null;
const subs = new Set<() => void>();

let mpPromise: Promise<MpModule | null> | null = null;

function emit() {
  subs.forEach((f) => f());
}

export function camStream() {
  return stream;
}
export function camStatus() {
  return status;
}
export function camError() {
  return err;
}
export function camFramed() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}
export function onCamChange(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}
export function setGestureHandler(fn: ((g: Gesture) => void) | null) {
  gestureCb = fn;
}

export async function bindVideo(video: HTMLVideoElement) {
  if (!stream) return;
  video.srcObject = stream;
  video.muted = true;
  video.defaultMuted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.setAttribute("muted", "");
  video.setAttribute("autoplay", "");
  try {
    await video.play();
  } catch {
    /* autoplay race — metadata handler retries */
    video.onloadedmetadata = () => {
      void video.play();
    };
  }
}

export async function startHandCam(): Promise<{ ok: boolean; reason: string }> {
  if (stream && status === "live") return { ok: true, reason: "" };
  if (!navigator.mediaDevices?.getUserMedia) {
    status = "missing";
    err = "This browser has no camera API.";
    emit();
    return { ok: false, reason: err };
  }
  status = "starting";
  err = "";
  emit();
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "user" },
    });
  } catch (e) {
    const name = e instanceof DOMException ? e.name : "";
    status = name === "NotFoundError" ? "missing" : "blocked";
    err =
      name === "NotFoundError"
        ? "No camera on this machine."
        : name === "NotReadableError"
          ? "Camera is already open in another app."
          : camFramed()
            ? "The preview frame blocked the camera. Open PXD2 in its own tab."
            : "Camera permission denied. Allow camera for this site and try again.";
    emit();
    return { ok: false, reason: err };
  }
  status = "live";
  emit();
  await ensureHidden();
  void startHands();
  return { ok: true, reason: "" };
}

export function stopHandCam() {
  cancelAnimationFrame(raf);
  raf = 0;
  try {
    hands?.close();
  } catch {
    /* already closed */
  }
  hands = null;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  if (hidden) {
    hidden.srcObject = null;
    hidden.remove();
    hidden = null;
  }
  status = "off";
  err = "";
  emit();
}

async function ensureHidden() {
  if (hidden) {
    await bindVideo(hidden);
    return;
  }
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.autoplay = true;
  v.setAttribute("playsinline", "true");
  v.setAttribute("webkit-playsinline", "true");
  v.style.position = "fixed";
  v.style.left = "-9999px";
  v.style.width = "160px";
  v.style.height = "120px";
  v.setAttribute("aria-hidden", "true");
  document.body.appendChild(v);
  hidden = v;
  await bindVideo(v);
}

function loadHandsScript(): Promise<MpModule | null> {
  if (mpPromise) return mpPromise;
  mpPromise = new Promise((resolve) => {
    if ((window as unknown as { Hands?: unknown }).Hands) {
      resolve(window as unknown as MpModule);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js";
    s.async = true;
    s.onload = () => resolve(window as unknown as MpModule);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return mpPromise;
}

async function startHands() {
  const mp = await loadHandsScript();
  if (!mp?.Hands || !hidden) return;
  try {
    const h = new mp.Hands({
      locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}`,
    });
    h.setOptions({
      maxNumHands: 1,
      modelComplexity: 0,
      minDetectionConfidence: 0.55,
      minTrackingConfidence: 0.55,
    });
    h.onResults((r) => {
      const lm = r.multiHandLandmarks?.[0];
      if (!lm) return;
      const g = detectGesture(lm);
      if (!g) return;
      const now = Date.now();
      if (now - lastG < 850) return;
      lastG = now;
      gestureCb?.(g);
    });
    hands = h;
    const tick = async () => {
      if (hidden && hidden.readyState >= 2 && hands) {
        try {
          await hands.send({ image: hidden });
        } catch {
          /* frame drop */
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  } catch {
    /* camera still live without tracking */
  }
}
