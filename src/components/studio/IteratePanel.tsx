import { useState } from "react";
import { reviewPart } from "@/lib/ai/review-part";
import { PRESETS } from "@/lib/cad/presets";
import { scadFromPart } from "@/lib/cad/intent";
import { useCad } from "@/lib/cad/store";
import { Btn, Field, Label } from "./chrome";

export function IteratePanel() {
  const part = useCad((s) => s.part);
  const revisions = useCad((s) => s.revisions);
  const snapshot = useCad((s) => s.snapshot);
  const loadRevision = useCad((s) => s.loadRevision);
  const setPart = useCad((s) => s.setPart);
  const pegSplit = useCad((s) => s.pegSplit);
  const reviewing = useCad((s) => s.reviewing);
  const review = useCad((s) => s.review);
  const setReviewing = useCad((s) => s.setReviewing);
  const setReview = useCad((s) => s.setReview);
  const pushLog = useCad((s) => s.pushLog);
  const cam = useCad((s) => s.cam);
  const [note, setNote] = useState("first cut");

  const runReview = async () => {
    setReviewing(true);
    pushLog("Reviewer desk…");
    try {
      const card = JSON.stringify({
        name: part.name,
        width: part.width,
        height: part.height,
        thick: part.thick,
        holes: part.holes,
        tiles: part.tiles?.length ?? 0,
        ask: part.ask,
      });
      const res = await reviewPart({ data: { card } });
      if (res.ok) {
        setReview(res.text);
        pushLog("Reviewer returned.");
      } else {
        setReview(res.error);
        pushLog(res.error);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Review failed";
      setReview(msg);
    } finally {
      setReviewing(false);
    }
  };

  const oversize = () => {
    const lid = PRESETS.find((p) => p.id === "lid")!.part;
    setPart(lid, scadFromPart(lid));
    cam("reset");
    pushLog("Loaded 400 mm lid — split it for the K2.");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
      <div>
        <h2 className="text-sm font-semibold text-fg">Iterate</h2>
        <p className="mt-1 text-sm text-muted">
          Scan · Fit · Reviewer. Snapshot a revision, peg-split what will not fit the K2, then ask Grok to punch holes
          in the card.
        </p>
      </div>
      <div className="flex gap-2">
        <Field value={note} onChange={(e) => setNote(e.target.value)} placeholder="Revision note" />
        <Btn kind="primary" onClick={() => snapshot(note || "rev")}>
          Snapshot
        </Btn>
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn onClick={oversize}>400 mm lid</Btn>
        <Btn onClick={pegSplit}>Peg-split</Btn>
        <Btn onClick={() => void runReview()} disabled={reviewing}>
          {reviewing ? "Reviewing…" : "Reviewer"}
        </Btn>
      </div>
      {review && (
        <pre className="whitespace-pre-wrap rounded-md border border-border bg-bg p-3 font-mono text-xs leading-relaxed text-muted">
          {review}
        </pre>
      )}
      <Label>Revisions</Label>
      {revisions.length === 0 ? (
        <p className="text-sm text-faint">No snapshots yet.</p>
      ) : (
        <ul className="space-y-1">
          {revisions.map((r) => (
            <li key={r.id}>
              <Btn className="h-auto min-h-11 w-full justify-between" onClick={() => loadRevision(r.id)}>
                <span className="font-mono">{r.id}</span>
                <span className="text-xs font-normal text-faint">
                  {r.note} · {r.action}
                </span>
              </Btn>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
