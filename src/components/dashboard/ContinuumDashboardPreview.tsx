import React from "react";
import {
  Bookmark as BookmarkIcon,
  Clock as ClockIcon,
  FileText as FileTextIcon,
  FolderOpen as FolderOpenIcon,
  Layers as LayersIcon,
  Network as NetworkIcon,
  Plus as PlusIcon,
  Sparkles as SparklesIcon,
  TrendingUp as TrendingUpIcon,
  Users as UsersIcon,
} from "@/lib/heroicons";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function createSizedIcon(Component: React.ComponentType<React.SVGProps<SVGSVGElement>>) {
  return function SizedIcon({ size = 16, ...props }: IconProps) {
    return <Component width={size} height={size} {...props} />;
  };
}

const Bookmark = createSizedIcon(BookmarkIcon);
const Clock = createSizedIcon(ClockIcon);
const FileText = createSizedIcon(FileTextIcon);
const FolderOpen = createSizedIcon(FolderOpenIcon);
const Layers = createSizedIcon(LayersIcon);
const Network = createSizedIcon(NetworkIcon);
const Plus = createSizedIcon(PlusIcon);
const Sparkles = createSizedIcon(SparklesIcon);
const TrendingUp = createSizedIcon(TrendingUpIcon);
const Users = createSizedIcon(UsersIcon);

const CSS = `
@keyframes cxFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes cxModalIn { from { opacity: 0; transform: scale(.98) translateY(-6px); } to { opacity: 1; transform: scale(1) translateY(0); } }

.cx-root {
  --bg-base:#05070a; --bg-surface:#0b1016; --bg-surface-2:#121923; --bg-hover:#1a2432; --bg-active:#223042; --bg-selected:rgba(255,255,255,.08);
  --text-primary:#f5f7fb; --text-secondary:#9aa5b1; --text-tertiary:#6f7b8a; --text-disabled:#4b5563; --text-on-accent:#05070a;
  --accent:#f5f7fb; --accent-hover:#ffffff; --accent-soft:rgba(245,247,251,.14); --accent-ring:rgba(245,247,251,.34);
  --success:#3dd68c; --warning:#e8b14d; --danger:#f0616d; --info:#5ba8f0;
  --radius-sm:8px; --radius-md:12px; --radius-lg:16px;
  --shadow-xs:0 1px 2px rgba(0,0,0,.26);
  --shadow-sm:0 10px 24px rgba(0,0,0,.34);
  --shadow-md:0 20px 50px rgba(0,0,0,.42);
  --ease-standard:cubic-bezier(.2,0,0,1); --ease-out:cubic-bezier(.16,1,.3,1);
  --dur-fast:120ms; --dur-base:180ms; --dur-slow:240ms;
  --font-ui:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif;
  --font-serif:ui-serif,Georgia,"Source Serif 4",Cambria,serif;
  background:linear-gradient(180deg, #05070a 0%, #090d13 100%); color:var(--text-primary); font-family:var(--font-ui);
  -webkit-font-smoothing:antialiased;
}

.cx-card { background:rgba(11,16,22,.9); border:1px solid rgba(255,255,255,.06); border-radius:var(--radius-md); padding:20px; box-shadow:var(--shadow-xs); }
.cx-btn { all:unset; box-sizing:border-box; height:36px; padding:0 14px; border-radius:var(--radius-sm); font-size:13px; font-weight:600; display:inline-flex; align-items:center; justify-content:center; gap:8px; cursor:pointer; transition:background var(--dur-fast) var(--ease-standard), transform var(--dur-fast); font-family:var(--font-ui); white-space:nowrap; }
.cx-btn:active { transform:scale(.98); }
.cx-btn:focus-visible { outline:2px solid var(--accent-ring); outline-offset:2px; }
.cx-btn-primary { background:var(--accent); color:var(--text-on-accent); }
.cx-btn-primary:hover { background:var(--accent-hover); }
.cx-btn-secondary { background:rgba(255,255,255,.06); color:var(--text-primary); }
.cx-btn-secondary:hover { background:rgba(255,255,255,.1); }
.cx-btn-ghost { background:transparent; color:var(--text-secondary); }
.cx-btn-ghost:hover { background:rgba(255,255,255,.06); color:var(--text-primary); }
.cx-btn-icon { all:unset; box-sizing:border-box; width:36px; height:36px; padding:0; border-radius:999px; background:rgba(255,255,255,.06); color:var(--text-secondary); display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:background var(--dur-fast), color var(--dur-fast); flex-shrink:0; }
.cx-btn-icon:hover { background:rgba(255,255,255,.1); color:var(--text-primary); }
.cx-btn-icon:focus-visible { outline:2px solid var(--accent-ring); outline-offset:2px; }
.cx-text-2xl { font-size:30px; line-height:38px; font-weight:600; letter-spacing:-.01em; margin:0; }
.cx-text-xl { font-size:22px; line-height:30px; font-weight:600; letter-spacing:-.01em; margin:0; }
.cx-text-lg { font-size:17px; line-height:26px; font-weight:600; margin:0; }
.cx-text-base { font-size:14px; line-height:22px; font-weight:500; margin:0; }
.cx-text-sm { font-size:13px; line-height:20px; font-weight:400; margin:0; }
.cx-text-xs { font-size:12px; line-height:16px; font-weight:500; margin:0; }
.cx-text-secondary { color:var(--text-secondary); }
.cx-text-tertiary { color:var(--text-tertiary); }
.cx-badge { display:inline-flex; align-items:center; height:24px; padding:0 10px; border-radius:999px; font-size:11px; font-weight:600; white-space:nowrap; font-family:var(--font-ui); }
.cx-badge-accent { background:var(--accent-soft); color:var(--accent); }
.cx-badge-neutral { background:rgba(255,255,255,.06); color:var(--text-secondary); }
.cx-badge-info { background:rgba(91,168,240,.14); color:var(--info); }
.cx-table-row { transition:background var(--dur-fast); }
.cx-table-row:hover { background:rgba(255,255,255,.04); }
.cx-scrollbar::-webkit-scrollbar { width:8px; height:8px; }
.cx-scrollbar::-webkit-scrollbar-thumb { background:rgba(255,255,255,.12); border-radius:4px; }
.cx-scrollbar::-webkit-scrollbar-track { background:transparent; }
@media (prefers-reduced-motion: reduce) { .cx-root *, .cx-root *::before, .cx-root *::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important; } }
`;

type Trend = "up" | "down" | "neutral";

export interface StatItem {
  label: string;
  value: string | number;
  delta: string;
  trend: Trend;
}

export interface PreviewDocument {
  title: string;
  type: "Concept" | "Note" | "Reference";
  connections: number;
  updated: string;
}

interface ContinuumDashboardPreviewProps {
  greeting?: string;
  displayName?: string;
  stats?: StatItem[];
  documents?: PreviewDocument[];
  onCreateNote?: () => void;
  onOpenNotes?: () => void;
  onOpenEntities?: () => void;
  onOpenInsights?: () => void;
  onOpenActivities?: () => void;
  onOpenProjects?: () => void;
  onOpenGraph?: () => void;
  onOpenEditor?: () => void;
}

const typeBadge = {
  Concept: "cx-badge-accent",
  Note: "cx-badge-neutral",
  Reference: "cx-badge-info",
};

export default function ContinuumDashboardPreview({
  greeting = "Good morning",
  displayName = "there",
  stats = [
    { label: "Notes", value: "24", delta: "+2 this week", trend: "up" },
    { label: "Entities", value: "18", delta: "+3", trend: "up" },
    { label: "Connections", value: "68", delta: "+8%", trend: "up" },
    { label: "Storage", value: "1.4 GB", delta: "of 8 GB", trend: "neutral" },
  ],
  documents = [
    { title: "Systems Thinking", type: "Concept", connections: 11, updated: "2h ago" },
    { title: "Product Strategy Q3", type: "Note", connections: 7, updated: "5h ago" },
    { title: "Research: LLM Evaluation", type: "Reference", connections: 24, updated: "1d ago" },
  ],
  onCreateNote,
  onOpenNotes,
  onOpenEntities,
  onOpenInsights,
  onOpenActivities,
  onOpenProjects,
  onOpenGraph,
  onOpenEditor,
}: ContinuumDashboardPreviewProps) {
  return (
    <div className="cx-root" style={{ minHeight: "100vh", width: "100%" }}>
      <style>{CSS}</style>

      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "24px 16px 64px" }}>
        <header className="cx-card" style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 20 }}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="cx-text-xs cx-text-tertiary" style={{ textTransform: "uppercase", letterSpacing: ".18em", marginBottom: 8 }}>
                Workspace overview
              </p>
              <h1 className="cx-text-2xl">{greeting}, {displayName}</h1>
              <p className="cx-text-sm cx-text-secondary" style={{ marginTop: 8 }}>
                A more intentional dashboard for note-taking, graph discovery, and momentum.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button className="cx-btn cx-btn-secondary" onClick={onOpenActivities}>
                <Clock size={14} /> Activities
              </button>
              <button className="cx-btn cx-btn-secondary" onClick={onOpenProjects}>
                <FolderOpen size={14} /> Projects
              </button>
              <button className="cx-btn cx-btn-primary" onClick={onCreateNote}>
                <Plus size={14} /> New note
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="cx-btn cx-btn-ghost" onClick={onOpenNotes}>
              <FileText size={14} /> Notes
            </button>
            <button className="cx-btn cx-btn-ghost" onClick={onOpenEntities}>
              <Network size={14} /> Entities
            </button>
            <button className="cx-btn cx-btn-ghost" onClick={onOpenInsights}>
              <TrendingUp size={14} /> Insights
            </button>
            <button className="cx-btn cx-btn-ghost" onClick={onOpenGraph}>
              <Layers size={14} /> Graph
            </button>
          </div>
        </header>

        <section
          className="flex flex-wrap items-start gap-x-10 gap-y-6"
          style={{ marginBottom: 24, padding: "4px 4px 20px" }}
        >
          {stats.map((s) => (
            <div key={s.label} style={{ minWidth: 96 }}>
              <div
                className="cx-text-2xl"
                style={{ fontSize: 30, lineHeight: "36px", fontWeight: 600, letterSpacing: "-0.01em" }}
              >
                {s.value}
              </div>
              <p
                className="cx-text-sm cx-text-secondary"
                style={{ marginTop: 4, fontSize: 13 }}
              >
                {s.label}
              </p>
              {s.delta ? (
                <span
                  className="cx-badge cx-badge-neutral"
                  style={{ marginTop: 10, height: 22, padding: "0 8px", fontSize: 11 }}
                >
                  {s.delta}
                </span>
              ) : null}
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="cx-card xl:col-span-2" style={{ padding: 0, overflow: "hidden" }}>
            <div className="flex items-center justify-between" style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
              <div>
                <h2 className="cx-text-lg">Recently edited</h2>
                <p className="cx-text-sm cx-text-secondary" style={{ marginTop: 2 }}>The latest thinking from your workspace.</p>
              </div>
              <button className="cx-btn cx-btn-ghost" onClick={onOpenNotes}>View all</button>
            </div>

            <div className="cx-scrollbar" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                <thead>
                  <tr>
                    <th className="cx-text-xs cx-text-tertiary" style={{ textAlign: "left", padding: "14px 20px", fontWeight: 600 }}>Title</th>
                    <th className="cx-text-xs cx-text-tertiary" style={{ textAlign: "left", padding: "14px 12px", fontWeight: 600 }}>Type</th>
                    <th className="cx-text-xs cx-text-tertiary" style={{ textAlign: "left", padding: "14px 12px", fontWeight: 600 }}>Links</th>
                    <th className="cx-text-xs cx-text-tertiary" style={{ textAlign: "left", padding: "14px 12px", fontWeight: 600 }}>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.title} className="cx-table-row">
                      <td className="cx-text-sm" style={{ padding: "14px 20px", fontWeight: 600 }}>{doc.title}</td>
                      <td style={{ padding: "14px 12px" }}>
                        <span className={`cx-badge ${typeBadge[doc.type]}`}>{doc.type}</span>
                      </td>
                      <td className="cx-text-sm cx-text-secondary" style={{ padding: "14px 12px" }}>{doc.connections}</td>
                      <td className="cx-text-sm cx-text-tertiary" style={{ padding: "14px 12px" }}>{doc.updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-5">
            <div className="cx-card">
              <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
                <h2 className="cx-text-lg">Continue writing</h2>
                <span className="cx-badge cx-badge-neutral">Draft</span>
              </div>
              <p className="cx-text-sm cx-text-secondary" style={{ marginBottom: 18 }}>
                The graph is not the knowledge itself — it is the shape memory takes when ideas are allowed to connect.
              </p>
              <div className="flex items-center gap-2" style={{ marginBottom: 18 }}>
                <button className="cx-btn-icon" onClick={onOpenEditor}><Sparkles size={15} /></button>
                <button className="cx-btn-icon" onClick={onOpenEntities}><Users size={15} /></button>
                <button className="cx-btn-icon" onClick={onOpenInsights}><TrendingUp size={15} /></button>
              </div>
              <button className="cx-btn cx-btn-secondary" style={{ width: "100%", justifyContent: "center" }} onClick={onOpenEditor}>
                Open in editor
              </button>
            </div>

            <div className="cx-card">
              <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <h2 className="cx-text-lg">Quick actions</h2>
                <Bookmark size={15} className="cx-text-tertiary" />
              </div>
              <div className="space-y-2">
                <button className="cx-btn cx-btn-ghost" style={{ width: "100%", justifyContent: "flex-start" }} onClick={onOpenNotes}>
                  <FileText size={14} /> Review notes
                </button>
                <button className="cx-btn cx-btn-ghost" style={{ width: "100%", justifyContent: "flex-start" }} onClick={onOpenEntities}>
                  <Network size={14} /> Explore entities
                </button>
                <button className="cx-btn cx-btn-ghost" style={{ width: "100%", justifyContent: "flex-start" }} onClick={onOpenGraph}>
                  <Layers size={14} /> See graph
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
