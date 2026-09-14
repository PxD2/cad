import { useEffect, useState } from "react";
import { useCad } from "@/lib/cad/store";

export function LogPanel() {
  const log = useCad((s) => s.log);
  const [live, setLive] = useState(false);
  useEffect(() => setLive(true), []);
  return (
    <div className="flex max-h-28 flex-col overflow-hidden border-t border-border bg-bg md:max-h-36">
      <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-faint">Log</div>
      <ol className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 font-mono text-xs leading-relaxed text-muted">
        {log.slice(-40).map((e, i) => (
          <li key={`${e.t}-${i}`}>
            {live && <span className="text-faint">{new Date(e.t).toLocaleTimeString()} </span>}
            {e.text}
          </li>
        ))}
      </ol>
    </div>
  );
}
