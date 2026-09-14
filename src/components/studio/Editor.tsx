import { importFile } from "@/lib/cad/io";
import { useCad } from "@/lib/cad/store";
import { Area, Btn } from "./chrome";

export function Editor() {
  const scad = useCad((s) => s.scad);
  const setScad = useCad((s) => s.setScad);
  const compile = useCad((s) => s.compile);
  const postScad = useCad((s) => s.postScad);
  const dropLib = useCad((s) => s.dropLib);
  const pushLog = useCad((s) => s.pushLog);

  return (
    <div
      className="flex h-48 flex-col border-t border-border bg-surface md:h-56"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const lib = e.dataTransfer.getData("application/x-beni-lib");
        if (lib) {
          dropLib(lib);
          return;
        }
        const file = e.dataTransfer.files[0];
        if (!file) return;
        void importFile(file).then((hit) => {
          if (hit.scad) {
            useCad.getState().setPart(hit.part!, hit.scad);
            pushLog(`${file.name}: posted into the pad`);
          } else if (hit.verts) {
            useCad.getState().addScan(hit.name, hit.verts);
          }
        });
      }}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-faint">SCAD pad</span>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-faint sm:inline">Drop a script · Ctrl+Enter compiles</span>
          <Btn kind="quiet" className="min-h-8 px-2 text-xs" onClick={() => postScad()}>
            Post
          </Btn>
          <Btn kind="quiet" className="min-h-8 px-2 text-xs md:hidden" onClick={compile}>
            Compile
          </Btn>
        </div>
      </div>
      <Area
        className="min-h-0 flex-1 rounded-none border-0 bg-bg px-3 pb-3"
        value={scad}
        spellCheck={false}
        onChange={(e) => setScad(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            compile();
          }
        }}
        aria-label="OpenSCAD editor"
      />
    </div>
  );
}
