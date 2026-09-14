import { createServerFn } from "@tanstack/react-start";
import { searchThings, twinForQuery, type ThingHit } from "@/lib/cad/thingiverse";

export const searchThingsLive = createServerFn({ method: "POST" })
  .validator((input: { q: string }) => input)
  .handler(async ({ data }) => {
    const q = data.q.trim().slice(0, 80);
    const local = searchThings(q).slice(0, 18);
    const extra = await githubHits(q);
    const seen = new Set(local.map((h) => h.id));
    const hits: ThingHit[] = [...local];
    for (const h of extra) {
      if (seen.has(h.id)) continue;
      seen.add(h.id);
      hits.push(h);
    }
    return { ok: true as const, hits: hits.slice(0, 24) };
  });

async function githubHits(q: string): Promise<ThingHit[]> {
  if (!q) return [];
  try {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(`${q} 3d-printing stl`)}&sort=stars&per_page=6`;
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "PXD2-CAD" },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as {
      items?: { id: number; full_name: string; html_url: string; description: string | null; stargazers_count: number; owner?: { login: string } }[];
    };
    return (body.items ?? []).map((it) => {
      const twin = twinForQuery(`${q} ${it.full_name} ${it.description || ""}`);
      return {
        id: `gh-${it.id}`,
        thingId: null,
        name: it.full_name,
        maker: it.owner?.login || "github",
        license: "see repo",
        tags: "Mounts",
        url: it.html_url,
        twin,
        source: "github" as const,
        hint: `PXD2 solid ${twin} · ${(it.description || `${it.stargazers_count}★`).slice(0, 60)}`,
      };
    });
  } catch {
    return [];
  }
}
