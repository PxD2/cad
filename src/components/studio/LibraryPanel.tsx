import { useEffect, useMemo, useState } from "react";
import { searchThingsLive } from "@/lib/ai/search-things";
import { LIBRARY, LIB_GROUPS } from "@/lib/cad/library";
import { KITS } from "@/lib/cad/kits";
import { useCad } from "@/lib/cad/store";
import { searchThings, THINGIVERSE, THING_TAGS, type ThingHit } from "@/lib/cad/thingiverse";
import { Btn, Chip, Field, Label } from "./chrome";

export function LibraryPanel() {
  const dropLib = useCad((s) => s.dropLib);
  const stampAt = useCad((s) => s.stampAt);
  const stackAt = useCad((s) => s.stackAt);
  const posts = useCad((s) => s.posts);
  const loadPost = useCad((s) => s.loadPost);
  const dropPost = useCad((s) => s.dropPost);
  const libSource = useCad((s) => s.libSource);
  const setLibSource = useCad((s) => s.setLibSource);
  const thingsQuery = useCad((s) => s.thingsQuery);
  const setThingsQuery = useCad((s) => s.setThingsQuery);
  const stampThing = useCad((s) => s.stampThing);
  const loadThing = useCad((s) => s.loadThing);
  const loadKit = useCad((s) => s.loadKit);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<(typeof LIB_GROUPS)[number] | "All">("All");
  const [tag, setTag] = useState<(typeof THING_TAGS)[number] | "All">("All");
  const [live, setLive] = useState<ThingHit[] | null>(null);
  const [busy, setBusy] = useState(false);

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    return LIBRARY.filter((it) => {
      if (group !== "All" && it.group !== group) return false;
      if (!s) return true;
      return `${it.name} ${it.hint} ${it.source} ${it.solid.kind} ${it.id}`.toLowerCase().includes(s);
    });
  }, [q, group]);

  const shown = q.trim() ? items.slice(0, 80) : items.slice(0, 36);

  const tvHits = useMemo(() => {
    const query = thingsQuery || q;
    return searchThings(query, tag === "All" ? undefined : tag).slice(0, 36);
  }, [thingsQuery, q, tag]);

  useEffect(() => {
    if (libSource !== "tv") return;
    const query = (thingsQuery || q).trim();
    if (!query) {
      setLive(null);
      return;
    }
    let on = true;
    setBusy(true);
    void searchThingsLive({ data: { q: query } })
      .then((res) => {
        if (on && res.ok) setLive(res.hits);
      })
      .finally(() => {
        if (on) setBusy(false);
      });
    return () => {
      on = false;
    };
  }, [libSource, thingsQuery, q]);

  const things = live && (thingsQuery || q).trim() ? live : tvHits;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
      <div>
        <h2 className="text-sm font-semibold text-fg">Open parts</h2>
        <p className="mt-1 text-sm text-muted">
          Every shop class: gears, belts, shafts, rails, electronics. Stamp two pulleys, then Easy belt — the loop snaps to
          whole teeth and follows the pulleys.
        </p>
      </div>
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">Assemblies</h3>
        <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {KITS.map((kit) => (
            <div key={kit.id} className="rounded-sm border border-border bg-raised p-2">
              <p className="text-sm font-medium text-fg">{kit.name}</p>
              <p className="font-mono text-xs text-faint">{kit.hint}</p>
              <Btn kind="primary" className="mt-1.5 min-h-11 w-full" onClick={() => loadKit(kit.id)}>
                Assemble
              </Btn>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Chip active={libSource === "beni"} onClick={() => setLibSource("beni")}>
          PXD2 · {LIBRARY.length}
        </Chip>
        <Chip active={libSource === "tv"} onClick={() => setLibSource("tv")}>
          Thingiverse · {THINGIVERSE.length}
        </Chip>
      </div>
      <Field
        value={libSource === "tv" ? thingsQuery : q}
        onChange={(e) => {
          if (libSource === "tv") setThingsQuery(e.target.value);
          else setQ(e.target.value);
        }}
        placeholder={libSource === "tv" ? "Search Thingiverse, paste thing:16627…" : "Search 20T, GT2, 608, NEMA 17…"}
        aria-label="Search parts"
      />
      {libSource === "tv" ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            <Chip active={tag === "All"} onClick={() => setTag("All")}>
              All
            </Chip>
            {THING_TAGS.map((g) => (
              <Chip key={g} active={tag === g} onClick={() => setTag(g)}>
                {g}
              </Chip>
            ))}
          </div>
          <p className="font-mono text-xs text-faint">
            {busy ? "Searching open remakes…" : `${things.length} premade`}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {things.map((hit) => (
              <ThingCard key={hit.id} hit={hit} onLoad={loadThing} onStamp={stampThing} />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            <Chip active={group === "All"} onClick={() => setGroup("All")}>
              All
            </Chip>
            {LIB_GROUPS.map((g) => (
              <Chip key={g} active={group === g} onClick={() => setGroup(g)}>
                {g}
              </Chip>
            ))}
          </div>
          <p className="font-mono text-xs text-faint">
            Showing {shown.length} of {items.length}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {shown.map((it) => (
              <div key={it.id} className="rounded-sm border border-border bg-raised p-2">
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/x-beni-lib", it.id);
                    e.dataTransfer.setData("text/plain", it.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => dropLib(it.id)}
                  className="flex min-h-11 w-full flex-col items-start text-left"
                >
                  <span className="text-sm font-medium text-fg">{it.name}</span>
                  <span className="font-mono text-xs text-faint">
                    {it.hint} · {it.source}
                  </span>
                </button>
                <div className="mt-1.5 flex gap-1.5">
                  <Btn
                    kind="primary"
                    className="min-h-11 flex-1"
                    onClick={() => {
                      dropLib(it.id);
                      stampAt();
                    }}
                  >
                    Stamp
                  </Btn>
                  <Btn
                    kind="ghost"
                    className="min-h-11 flex-1"
                    onClick={() => {
                      dropLib(it.id);
                      stackAt();
                    }}
                  >
                    Stack
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <Label>Your SCAD posts</Label>
      {posts.length === 0 ? (
        <p className="text-sm text-faint">Compile a script in Model, then Post it here for reuse.</p>
      ) : (
        <ul className="space-y-1.5">
          {posts.map((p) => (
            <li key={p.id} className="flex gap-1.5">
              <Btn className="h-auto min-h-11 flex-1 justify-between" onClick={() => loadPost(p.id)}>
                <span>{p.name}</span>
                <span className="text-xs font-normal text-faint">{new Date(p.when).toLocaleDateString()}</span>
              </Btn>
              <Btn kind="quiet" onClick={() => dropPost(p.id)} aria-label={`Remove ${p.name}`}>
                Del
              </Btn>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ThingCard({
  hit,
  onLoad,
  onStamp,
}: {
  hit: ThingHit;
  onLoad: (h: ThingHit) => void;
  onStamp: (h: ThingHit, stack?: boolean) => void;
}) {
  return (
    <div className="rounded-sm border border-border bg-raised p-2">
      <button
        type="button"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("application/x-beni-thing", JSON.stringify(hit));
          e.dataTransfer.setData("text/plain", hit.twin || hit.name);
          e.dataTransfer.effectAllowed = "copy";
        }}
        onClick={() => onLoad(hit)}
        className="flex min-h-11 w-full flex-col items-start text-left"
      >
        <span className="text-sm font-medium text-fg">{hit.name}</span>
        <span className="font-mono text-xs text-faint">
          {hit.source === "thingiverse" ? `thing:${hit.thingId}` : hit.source} · {hit.maker} · {hit.license}
        </span>
      </button>
      <div className="mt-1.5 flex gap-1.5">
        <Btn kind="primary" className="min-h-11 flex-1" onClick={() => onStamp(hit)}>
          Stamp
        </Btn>
        <Btn kind="ghost" className="min-h-11 flex-1" onClick={() => onStamp(hit, true)}>
          Stack
        </Btn>
        {hit.url ? (
          <a
            href={hit.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center px-2 text-xs text-muted hover:text-fg"
          >
            Open
          </a>
        ) : null}
      </div>
    </div>
  );
}
