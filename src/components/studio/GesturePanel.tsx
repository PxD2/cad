import { useEffect, useRef, useState } from "react";
import { GESTURE_HELP, type Gesture } from "@/lib/cad/gesture";
import {
  bindVideo,
  camError,
  camFramed,
  camStatus,
  onCamChange,
  setGestureHandler,
  startHandCam,
  stopHandCam,
} from "@/lib/cad/hand-cam";
import { useCad } from "@/lib/cad/store";
import { Btn, Chip } from "./chrome";

export function GesturePanel() {
  const gestureOn = useCad((s) => s.gestureOn);
  const setGesture = useCad((s) => s.setGesture);
  const last = useCad((s) => s.lastGesture);
  const noteGesture = useCad((s) => s.noteGesture);
  const cam = useCad((s) => s.cam);
  const pushLog = useCad((s) => s.pushLog);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [, bump] = useState(0);
  const [err, setErr] = useState("");

  const apply = (g: Gesture) => {
    noteGesture(g);
    pushLog(`Gesture ${g} → ${GESTURE_HELP[g]}`);
    if (g === "pinch") cam("zoomin");
    else if (g === "fist") cam("rotcw");
    else if (g === "open_palm") cam("reset");
    else if (g === "v_sign") cam("zoomout");
  };

  useEffect(() => {
    setGestureHandler(apply);
    return onCamChange(() => {
      bump((n) => n + 1);
      if (videoRef.current && camStatus() === "live") void bindVideo(videoRef.current);
    });
  }, []);

  useEffect(() => {
    if (gestureOn && videoRef.current && camStatus() === "live") void bindVideo(videoRef.current);
  }, [gestureOn]);

  const start = async () => {
    setErr("");
    const res = await startHandCam();
    if (!res.ok) {
      setErr(res.reason);
      setGesture(false);
      return;
    }
    if (videoRef.current) await bindVideo(videoRef.current);
    setGesture(true);
    pushLog("Hand camera live in the viewport.");
  };

  const stop = () => {
    stopHandCam();
    setGesture(false);
    pushLog("Hand camera off.");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
      <div>
        <h2 className="text-sm font-semibold text-fg">Hands</h2>
        <p className="mt-1 text-sm text-muted">
          Camera stays on the bed as a picture-in-picture — switching tabs does not kill it. Pinch zoom in · fist
          rotate · palm reset · V zoom out.
        </p>
      </div>
      <Btn kind="primary" onClick={gestureOn ? stop : () => void start()}>
        {gestureOn ? "Stop camera" : "Start hand tracking"}
      </Btn>
      <div className="relative overflow-hidden rounded-md border border-border bg-bg">
        <video
          ref={videoRef}
          className="h-44 w-full -scale-x-100 object-cover"
          playsInline
          muted
          autoPlay
        />
        {camStatus() !== "live" && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/80 px-3 text-center text-sm text-muted">
            {err || camError() || "Camera off"}
          </div>
        )}
      </div>
      {last && <p className="font-mono text-sm text-steel">{last}</p>}
      {(err || camError()) && <p className="text-sm text-warn">{err || camError()}</p>}
      {camStatus() === "blocked" && camFramed() && (
        <Btn
          kind="ghost"
          onClick={() => {
            window.open(window.location.href, "_blank", "noopener");
          }}
        >
          Open studio in its own tab
        </Btn>
      )}
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(GESTURE_HELP) as Gesture[]).map((g) => (
          <Chip key={g} onClick={() => apply(g)}>
            {g.replace("_", " ")}
          </Chip>
        ))}
      </div>
    </div>
  );
}
