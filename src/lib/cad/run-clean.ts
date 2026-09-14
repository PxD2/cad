import { cleanScan } from "@/lib/ai/clean-scan";
import { cleanCloud, mergePlies, occupancy } from "./scan";
import { useCad } from "./store";

export async function runGrokClean() {
  const { scans, setCleaning, pushLog, cleanScansLocal } = useCad.getState();
  const vis = scans.filter((p) => p.visible);
  if (!vis.length) {
    pushLog("No visible plies to clean.");
    return;
  }
  const fused = mergePlies(vis);
  const occ = occupancy(fused);
  setCleaning(true);
  pushLog("Grok ← scan occupancy");
  try {
    const res = await cleanScan({
      data: { n: occ.n, empty: occ.empty, bbox: [...occ.bbox], bins: occ.bins },
    });
    if (res.ok) {
      useCad.setState((s) => ({
        scans: s.scans.map((p) =>
          p.visible ? { ...p, verts: cleanCloud(p.verts, res.voxel, res.stdMul, res.fill) } : p,
        ),
      }));
      pushLog(`Grok clean voxel ${res.voxel.toFixed(2)} · ×${res.stdMul.toFixed(2)} — ${res.note}`);
    } else {
      pushLog(res.error);
      cleanScansLocal(0.85, 1.35);
    }
  } catch (e) {
    pushLog(e instanceof Error ? e.message : "Grok clean failed.");
    cleanScansLocal(0.85, 1.35);
  } finally {
    setCleaning(false);
  }
}
