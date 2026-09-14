import { Box, DraftingCompass } from "lucide-react";
import { runLocalOrGrok } from "@/lib/cad/run-ask";
import { runShop } from "@/lib/cad/run-shop";
import { useCad } from "@/lib/cad/store";
import { askPlaceholder } from "@/lib/cad/units";
import { Btn, Field, UnitSwitch } from "./chrome";

export function AskBar() {
  const draft = useCad((s) => s.draft);
  const setDraft = useCad((s) => s.setDraft);
  const asking = useCad((s) => s.asking);
  const compile = useCad((s) => s.compile);
  const unit = useCad((s) => s.unit);
  const setUnit = useCad((s) => s.setUnit);
  const review = useCad((s) => s.review);

  const go = (grok: boolean) => {
    const q = draft.trim();
    if (!q) return;
    if (grok) void runShop(q);
    else void runLocalOrGrok(q, false);
  };

  return (
    <header className="flex flex-col gap-2 border-b border-border bg-surface px-3 py-2 md:flex-row md:items-center md:gap-3 md:px-4">
      <div className="flex items-center gap-2">
        <Mark />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-sm font-semibold tracking-tight text-fg">PXD2</div>
          <div className="text-xs text-faint">CAD · scan · print · K2 Plus</div>
        </div>
        <UnitSwitch value={unit} onChange={setUnit} className="md:hidden" />
      </div>
      <form
        className="flex min-w-0 flex-1 items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          go(true);
        }}
      >
        <Field
          id="pxd2-ask"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={askPlaceholder(unit)}
          aria-label="Ask for a part"
        />
        <Btn kind="primary" disabled={asking} onClick={() => go(true)} className="shrink-0">
          <DraftingCompass className="size-4" strokeWidth={1.75} />
          {asking ? "Grok…" : "Grok"}
        </Btn>
        <Btn className="hidden shrink-0 sm:inline-flex" onClick={() => go(false)}>
          Local
        </Btn>
        <Btn className="shrink-0" onClick={compile}>
          <Box className="size-4" strokeWidth={1.75} />
          Compile
        </Btn>
      </form>
      <UnitSwitch value={unit} onChange={setUnit} className="hidden md:flex" />
      {review ? (
        <p className="max-w-xl truncate font-mono text-xs text-steel md:max-w-xs" title={review}>
          {review}
        </p>
      ) : null}
    </header>
  );
}

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true">
      <rect width="32" height="32" rx="6" className="fill-raised stroke-border" strokeWidth="1" />
      <rect x="6" y="9" width="20" height="14" rx="1.2" fill="none" className="stroke-steel" strokeWidth="1.6" />
      <circle cx="11" cy="14" r="1.6" fill="none" className="stroke-steel" strokeWidth="1.3" />
      <circle cx="21" cy="14" r="1.6" fill="none" className="stroke-steel" strokeWidth="1.3" />
      <circle cx="11" cy="19" r="1.6" fill="none" className="stroke-steel" strokeWidth="1.3" />
      <circle cx="21" cy="19" r="1.6" fill="none" className="stroke-steel" strokeWidth="1.3" />
    </svg>
  );
}
