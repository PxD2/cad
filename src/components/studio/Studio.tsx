import { Box, FolderOpen, GitBranch, Hand, Library, Mic, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCad, type Tab } from "@/lib/cad/store";
import { AskBar } from "./AskBar";
import { ConvertPanel } from "./ConvertPanel";
import { Editor } from "./Editor";
import { FilesPanel } from "./FilesPanel";
import { GesturePanel } from "./GesturePanel";
import { Hud } from "./Hud";
import { Inspector } from "./Inspector";
import { IteratePanel } from "./IteratePanel";
import { LibraryPanel } from "./LibraryPanel";
import { LogPanel } from "./LogPanel";
import { Viewport } from "./Viewport";
import { VoicePanel } from "./VoicePanel";

const TABS: { id: Tab; label: string; icon: typeof Box }[] = [
  { id: "model", label: "Model", icon: Box },
  { id: "library", label: "Parts", icon: Library },
  { id: "files", label: "Scans", icon: FolderOpen },
  { id: "convert", label: "Convert", icon: RefreshCw },
  { id: "iterate", label: "Iterate", icon: GitBranch },
  { id: "voice", label: "Voice", icon: Mic },
  { id: "gesture", label: "Hands", icon: Hand },
];

export function Studio() {
  const tab = useCad((s) => s.tab);
  const setTab = useCad((s) => s.setTab);
  const part = useCad((s) => s.part);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      <AskBar />
      <div className="flex min-h-0 flex-1">
        <nav className="hidden w-20 shrink-0 flex-col border-r border-border bg-surface py-2 md:flex">
          {TABS.map((t) => (
            <TabBtn key={t.id} t={t} active={tab === t.id} onClick={() => setTab(t.id)} />
          ))}
        </nav>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="relative h-[40vh] min-h-56 shrink-0 overflow-hidden md:h-auto md:min-h-0 md:flex-1">
            <Viewport part={part} />
            <Hud />
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto border-t border-border bg-surface md:flex-none md:overflow-visible">
            {tab === "model" ? (
              <>
                <Editor />
                <LogPanel />
                <div className="md:hidden">
                  <Inspector />
                </div>
              </>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col md:max-h-[42vh]">
                <TabBody tab={tab} />
              </div>
            )}
          </div>
        </div>
        <div className="hidden md:flex">
          <Inspector />
        </div>
      </div>
      <nav className="flex shrink-0 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {TABS.map((t) => (
          <TabBtn key={t.id} t={t} active={tab === t.id} onClick={() => setTab(t.id)} compact />
        ))}
      </nav>
    </div>
  );
}

function TabBody({ tab }: { tab: Tab }) {
  if (tab === "voice") return <VoicePanel />;
  if (tab === "gesture") return <GesturePanel />;
  if (tab === "convert") return <ConvertPanel />;
  if (tab === "files") return <FilesPanel />;
  if (tab === "library") return <LibraryPanel />;
  if (tab === "iterate") return <IteratePanel />;
  return null;
}

function TabBtn({
  t,
  active,
  onClick,
  compact,
}: {
  t: (typeof TABS)[number];
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const Icon = t.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-medium tracking-wide md:flex-none md:py-3",
        active ? "text-fg" : "text-faint hover:text-muted",
        compact && "min-h-14",
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} />
      {t.label}
    </button>
  );
}
