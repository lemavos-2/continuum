import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { notesApi, foldersApi, vaultApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import UpgradeModal from "@/components/UpgradeModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Plus, Search, StickyNote, Trash2, Loader2, Heart, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface NoteSummary { id: string; title: string; type?: string; folderId?: string; createdAt: string; updatedAt: string; content?: string; favorite?: boolean; }
interface FolderItem { id: string; name: string; parentId?: string; }

// Helper to get type badge colors
function getTypeBadgeColor(type?: string): string {
  if (!type) return "bg-white/5 text-white/70";
  const hash = type.charCodeAt(0);
  const colors = [
    "bg-zinc-500/20 text-zinc-200 border border-zinc-500/30",
    "bg-zinc-500/20 text-zinc-200 border border-zinc-500/30",
    "bg-zinc-500/20 text-zinc-200 border border-zinc-500/30",
    "bg-zinc-500/20 text-zinc-200 border border-zinc-500/30",
    "bg-zinc-500/20 text-zinc-200 border border-zinc-500/30",
  ];
  return colors[hash % colors.length];
}

// Get preview of note content
function getPreview(content?: string): string {
  if (!content) return "No content";
  const plain = content.replace(/<[^>]*>/g, "").trim();
  return plain.slice(0, 80) + (plain.length > 80 ? "..." : "");
}

export default function Notes() {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [pendingDeleteNote, setPendingDeleteNote] = useState<NoteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading: authLoading } = useRequireAuth();
  const { canCreateNote, getLimitMessage, refresh, applyUsageDelta } = usePlanGate();

  // Toggle favorite — persisted on backend
  const toggleFavorite = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistic update
    setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, favorite: !n.favorite } : n));
    try {
      const { data } = await notesApi.toggleFavorite(noteId);
      setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, favorite: !!data.favorite } : n));
    } catch {
      // Rollback
      setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, favorite: !n.favorite } : n));
      toast({ title: "Could not update favorite", variant: "destructive" });
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [notesRes, foldersRes, typesRes] = await Promise.all([notesApi.list(), foldersApi.list(), notesApi.getTypes()]);
      setNotes(Array.isArray(notesRes.data) ? notesRes.data : []);
      setFolders(Array.isArray(foldersRes.data) ? foldersRes.data : []);
      setTypes(Array.isArray(typesRes.data) ? typesRes.data : []);
    } catch { toast({ title: "Error loading notes", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const handleCreateNote = async () => {
    if (!canCreateNote) { setUpgradeOpen(true); return; }
    try {
      const { data } = await notesApi.create("New Note", "", selectedFolder || undefined);
      applyUsageDelta({ notesCount: 1 });
      void refresh();
      navigate(`/notes/${data.id}`);
    } catch (err: any) {
      if (err.response?.status === 403) setUpgradeOpen(true);
      else toast({ title: "Error", description: err.response?.data?.message || "Limit reached?", variant: "destructive" });
    }
  };

  const handleDeleteNote = (note: NoteSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDeleteNote(note);
  };

  const confirmDeleteNote = async () => {
    if (!pendingDeleteNote) return;
    try {
      await notesApi.delete(pendingDeleteNote.id);
      setNotes((prev) => prev.filter((n) => n.id !== pendingDeleteNote.id));
      applyUsageDelta({ notesCount: -1 });
      void refresh();
      const typesRes = await notesApi.getTypes();
      setTypes(Array.isArray(typesRes.data) ? typesRes.data : []);
    } catch {
      toast({ title: "Error deleting", variant: "destructive" });
    } finally {
      setPendingDeleteNote(null);
    }
  };

  const filtered = notes
    .sort((a, b) => {
      // Favorites first
      const aFav = !!a.favorite;
      const bFav = !!b.favorite;
      if (aFav !== bFav) return bFav ? 1 : -1;
      // Then by date
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })
    .filter((n) => {
      const matchSearch = n.title.toLowerCase().includes(search.toLowerCase());
      const matchFolder = selectedFolder ? n.folderId === selectedFolder : true;
      const matchType = selectedType ? n.type === selectedType : true;
      return matchSearch && matchFolder && matchType;
    });

  // Count notes by type
  const typeCounts = types.map((type) => ({
    type,
    count: notes.filter((n) => n.type === type).length,
  }));

  const limitMsg = getLimitMessage("notes");

  // Drag & drop upload to Vault directly from Notes
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await vaultApi.upload(form);
      toast({ title: "File uploaded", description: `${file.name} added to your Vault.` });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally { setUploading(false); }
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
  };

  return (
    <AppLayout>
      <div
        className="px-6 lg:px-12 py-10 max-w-6xl mx-auto relative"
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleFileDrop}
      >
        {dragActive && (
          <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center pointer-events-none">
            <div className="border-2 border-dashed border-white/40 rounded-xl p-12 text-center">
              <Upload className="w-8 h-8 mx-auto mb-3 text-white/80" />
              <p className="text-white text-sm">Drop file to upload to Vault</p>
            </div>
          </div>
        )}
        {uploading && (
          <div className="fixed top-4 right-4 z-50 bg-card border border-border rounded-md px-3 py-2 flex items-center gap-2 text-xs">
            <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
          </div>
        )}

        {/* Header — same pattern as /entities */}
        <header className="flex items-end justify-between border-b border-white/10 pb-6 mb-8">
          <div>
            <p className="label-caps mb-2">Index</p>
            <h1 className="font-serif text-5xl tracking-tight">Notes</h1>
            <p className="mt-2 text-sm text-white/50">
              {limitMsg || "Your thoughts, written down. Drag any file here to send it to Vault."}
            </p>
          </div>
          <button
            onClick={handleCreateNote}
            className="btn-primary"
            disabled={!canCreateNote && canCreateNote !== undefined}
          >
            <Plus className="w-4 h-4" /> New note
          </button>
        </header>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:w-44 lg:shrink-0 space-y-4">
            
            {/* Types section */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-3">Types</h3>
              <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                <button
                  onClick={() => setSelectedType(null)}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap px-3 py-2 rounded-lg text-sm transition-all shrink-0",
                    !selectedType ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  All Types
                </button>
                {types.length > 0 ? (
                  types.map((type) => {
                    const count = typeCounts.find((t) => t.type === type)?.count || 0;
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={cn(
                          "flex items-center justify-between gap-2 whitespace-nowrap px-3 py-2 rounded-lg text-sm transition-all w-full",
                          selectedType === type ? "bg-white/10 text-white font-medium" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-xs">#</span> {type}
                        </span>
                        <span className="text-xs font-semibold bg-white/10 px-2 py-0.5 rounded">{count}</span>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground px-3 py-1">No types yet. Add types to your notes to filter here.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes..." className="pl-9 bg-accent border-border/50" />
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <StickyNote className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground text-sm">No notes found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => navigate(`/notes/${note.id}`)}
                    className="group relative p-4 rounded-xl cursor-pointer transition-all borders-white/10 border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/20 hover:shadow-lg min-h-40 flex flex-col"
                  >
                    {/* Header with favorite button */}
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <h3 className="text-sm font-semibold text-white/90 line-clamp-2 flex-1">{note.title || "Untitled"}</h3>
                      <button
                        onClick={(e) => toggleFavorite(note.id, e)}
                        className="flex-shrink-0 p-1.5 rounded-lg transition-colors hover:bg-white/10"
                      >
                        <Heart className={cn("w-4 h-4", note.favorite ? "fill-zinc-400 text-zinc-400" : "text-white/40 hover:text-white/60")} />
                      </button>
                    </div>

                    {/* Type badge */}
                    {note.type && (
                      <div className={cn("inline-block text-xs font-medium px-2 py-1 rounded mb-3 w-fit", getTypeBadgeColor(note.type))}>
                        {note.type}
                      </div>
                    )}

                    {/* Preview */}
                    <p className="text-xs text-white/50 line-clamp-2 mb-auto flex-1">{getPreview(note.content)}</p>

                    {/* Footer with date and delete */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                      <span className="text-xs text-white/40">{new Date(note.updatedAt).toLocaleDateString("en-US")}</span>
                      <button
                        onClick={(e) => handleDeleteNote(note, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-zinc-500/20"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-zinc-400/60 hover:text-zinc-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason="You've reached the notes limit for your plan." />
      <ConfirmDialog
        open={!!pendingDeleteNote}
        onOpenChange={(open) => !open && setPendingDeleteNote(null)}
        title="Delete note?"
        description={
          pendingDeleteNote
            ? `${pendingDeleteNote.title || "Untitled"} will be permanently removed.`
            : "This action cannot be undone."
        }
        confirmText="Delete"
        destructive
        onConfirm={confirmDeleteNote}
      />
    </AppLayout>
  );
}
