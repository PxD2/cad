import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { dispatchVoice, speak } from "@/lib/cad/dispatch";
import { useCad } from "@/lib/cad/store";
import { Btn, Field } from "./chrome";

type Rec = {
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: ArrayLike<{ isFinal?: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
};

function makeRec(): Rec | null {
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.continuous = true;
  r.interimResults = true;
  r.lang = "en-US";
  return r;
}

export function VoicePanel() {
  const voiceOn = useCad((s) => s.voiceOn);
  const setVoice = useCad((s) => s.setVoice);
  const pushLog = useCad((s) => s.pushLog);
  const rec = useRef<Rec | null>(null);
  const [live, setLive] = useState("");
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    return () => {
      rec.current?.stop();
      rec.current = null;
      setVoice(false);
    };
  }, [setVoice]);

  const stop = () => {
    rec.current?.stop();
    rec.current = null;
    setVoice(false);
    setLive("");
  };

  const start = () => {
    const r = makeRec();
    if (!r) {
      setErr("This browser has no speech recognition. Type a command below.");
      return;
    }
    r.onresult = (ev) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < ev.results.length; i++) {
        const row = ev.results[i];
        if (row.isFinal) final += row[0].transcript;
        else interim += row[0].transcript;
      }
      setLive(interim || final);
      if (final.trim()) dispatchVoice(final, stop);
    };
    r.onerror = (ev) => setErr(ev.error === "not-allowed" ? "Microphone blocked." : ev.error);
    r.onend = () => {
      if (useCad.getState().voiceOn) {
        try {
          r.start();
        } catch {
          /* already started */
        }
      }
    };
    rec.current = r;
    try {
      r.start();
      setVoice(true);
      setErr("");
      pushLog("Voice assistant on.");
      speak("Assistant on.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start microphone.");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
      <div>
        <h2 className="text-sm font-semibold text-fg">Voice</h2>
        <p className="mt-1 text-sm text-muted">
          Zoom, rotate, compile, export, peg-split, or just say the part. PXD2 will not shut down a computer or open
          Notepad.
        </p>
      </div>
      <Btn kind="primary" onClick={voiceOn ? stop : start} className="w-full">
        {voiceOn ? <MicOff className="size-4" /> : <Mic className="size-4" />}
        {voiceOn ? "Stop listening" : "Start assistant"}
      </Btn>
      {live && <p className="rounded-md bg-raised px-3 py-2 font-mono text-sm text-steel">{live}</p>}
      {err && <p className="text-sm text-warn">{err}</p>}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (typed.trim()) dispatchVoice(typed, stop);
          setTyped("");
        }}
      >
        <Field value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type a command" />
        <Btn kind="ghost" type="submit">
          Run
        </Btn>
      </form>
      <ul className="space-y-1 font-mono text-xs text-faint">
        <li>zoom in / zoom out / rotate left / reset view</li>
        <li>stamp · stack · raise · lower · demo stack</li>
        <li>laser · laser off · align holes</li>
        <li>thingiverse for pulley · stamp benchy · stamp 608</li>
        <li>compound · compound with 60 · herringbone</li>
        <li>load spur 20 · load 608 · thicker</li>
        <li>use inches · use mm · use cm</li>
        <li>parts tab · scans tab · demo dual scan · auto-align · grok clean</li>
        <li>generate a 100 by 80 plate 6 mm thick with 4 M5 holes</li>
        <li>export stl · peg split · compile</li>
      </ul>
    </div>
  );
}
