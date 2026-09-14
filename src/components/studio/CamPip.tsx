import { useEffect, useRef, useState } from "react";
import { bindVideo, camStatus, onCamChange, stopHandCam } from "@/lib/cad/hand-cam";
import { useCad } from "@/lib/cad/store";

export function CamPip() {
  const gestureOn = useCad((s) => s.gestureOn);
  const setGesture = useCad((s) => s.setGesture);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    return onCamChange(() => {
      const on = camStatus() === "live";
      setLive(on);
      if (on && videoRef.current) void bindVideo(videoRef.current);
    });
  }, []);

  useEffect(() => {
    if (gestureOn && videoRef.current && camStatus() === "live") void bindVideo(videoRef.current);
    setLive(camStatus() === "live");
  }, [gestureOn]);

  if (!gestureOn && !live) return null;

  return (
    <div className="pointer-events-auto absolute bottom-10 left-3 overflow-hidden rounded-sm border border-border bg-bg shadow-sm">
      <video ref={videoRef} className="h-28 w-40 -scale-x-100 object-cover" playsInline muted autoPlay />
      <button
        type="button"
        className="absolute right-1 top-1 rounded-sm bg-bg/80 px-2 py-0.5 text-xs text-muted hover:text-fg"
        onClick={() => {
          stopHandCam();
          setGesture(false);
        }}
      >
        Close
      </button>
    </div>
  );
}
