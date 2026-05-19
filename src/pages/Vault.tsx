import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { vaultApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Image as ImageIcon, File as FileGeneric,
  Loader2, HardDrive, Trash2, Music, ExternalLink,
} from "lucide-react";
import type { VaultFile } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { getPlanLimits } from "@/lib/plan";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { resolveVaultBlob, invalidateVaultBlob } from "@/lib/vault-blob";

type Category = "images" | "audio" | "pdf" | "other";

function categoryOf(file: VaultFile): Category {
  const t = (file.contentType || "").toLowerCase();
  const n = (file.fileName || "").toLowerCase();
  if (t.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/.test(n)) return "images";
  if (t.startsWith("audio/") || /\.(mp3|m4a|wav|ogg|aac)$/.test(n)) return "audio";
  if (t === "application/pdf" || /\.pdf$/.test(n)) return "pdf";
  return "other";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function useBlobUrl(fileId: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!fileId) return;
    setError(false);
    resolveVaultBlob(fileId)
      .then((u) => { if (!cancelled) setUrl(u); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [fileId]);
  return { url, error };
}

function ImageThumb({ file, onDelete }: { file: VaultFile; onDelete: (f: VaultFile) => void }) {
  const { url, error } = useBlobUrl(file.id);
  return (
    <div className="group relative rounded-xl overflow-hidden border border-white/5 bg-neutral-900/40 aspect-square backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:scale-[1.02] hover:shadow-xl">
      {error ? (
        <div className="flex items-center justify-center h-full text-xs text-destructive">Failed to load</div>
      ) : url ? (
        <img src={url} alt={file.fileName} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <p className="text-xs font-medium text-white truncate">{file.fileName}</p>
        <p className="text-[10px] text-neutral-400 mt-0.5">{formatSize(file.size)}</p>
      </div>
      <Button
        type="button"
        size="icon"
        variant="destructive"
        className="absolute top-2 right-2 h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100 shadow-lg"
        onClick={() => onDelete(file)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function AudioPlayer({ file, onDelete }: { file: VaultFile; onDelete: (f: VaultFile) => void }) {
  const { url, error } = useBlobUrl(file.id);
  return (
    <div className="rounded-xl border border-white/5 bg-neutral-900/30 backdrop-blur-sm p-4 space-y-3 transition-all duration-300 hover:border-white/10 hover:bg-neutral-900/50">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-inner">
          <Music className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-neutral-200 truncate">{file.fileName}</p>
          <p className="text-xs text-neutral-500 mt-0.5">{formatSize(file.size)}</p>
        </div>
        <Button type="button" size="icon" variant="ghost" onClick={() => onDelete(file)} className="h-8 w-8 rounded-lg text-neutral-400 hover:text-destructive hover:bg-destructive/10 transition-colors">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-destructive">Failed to load audio</p>
      ) : url ? (
        <audio src={url} controls className="w-full h-9 accent-primary filter invert dark:invert-0 opacity-80 hover:opacity-100 transition-opacity" />
      ) : (
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Loader2 className="h-3 w-3 animate-spin text-primary" /> Loading audio player…
        </div>
      )}
    </div>
  );
}

function PdfCard({ file, onDelete, onOpen }: { file: VaultFile; onDelete: (f: VaultFile) => void; onOpen: (f: VaultFile) => void }) {
  const { url, error } = useBlobUrl(file.id);
  return (
    <div className="rounded-xl border border-white/5 bg-neutral-900/30 backdrop-blur-sm overflow-hidden flex flex-col transition-all duration-300 hover:border-white/10 hover:shadow-xl group">
      <button type="button" onClick={() => onOpen(file)} className="aspect-[3/4] bg-neutral-950 relative overflow-hidden border-b border-white/5">
        {error ? (
          <div className="flex items-center justify-center h-full text-xs text-destructive">Failed to load</div>
        ) : url ? (
          <iframe src={`${url}#toolbar=0&navpanes=0`} title={file.fileName} className="w-full h-full pointer-events-none opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        )}
        <div className="absolute inset-0 bg-neutral-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[1px]">
          <span className="text-xs font-medium bg-neutral-900/90 border border-white/10 px-3 py-1.5 rounded-lg shadow-2xl text-neutral-200 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">Quick Preview</span>
        </div>
      </button>
      <div className="p-3 flex items-center gap-2 bg-neutral-900/20">
        <FileText className="h-4 w-4 text-primary shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-neutral-200 truncate">{file.fileName}</p>
          <p className="text-[10px] text-neutral-500 mt-0.5">{formatSize(file.size)}</p>
        </div>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-neutral-400 hover:text-white" onClick={() => onOpen(file)}>
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-neutral-400 hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(file)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function OtherFileRow({ file, onDelete }: { file: VaultFile; onDelete: (f: VaultFile) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/5 bg-neutral-900/20 hover:bg-neutral-900/40 hover:border-white/10 transition-all duration-200">
      <div className="h-8 w-8 rounded-lg bg-neutral-800/50 flex items-center justify-center border border-white/5 shrink-0">
        <FileGeneric className="w-4 h-4 text-neutral-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-200 truncate">{file.fileName}</p>
        <p className="text-xs text-neutral-500 mt-0.5">
          {formatSize(file.size)} · {new Date(file.createdAt).toLocaleDateString()}
        </p>
      </div>
      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-neutral-400 hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={() => onDelete(file)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function Vault() {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<VaultFile | null>(null);
  const [pdfPreview, setPdfPreview] = useState<VaultFile | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { loading: authLoading } = useRequireAuth();
  const { applyUsageDelta } = usePlanGate();
  const limits = getPlanLimits(user);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data } = await vaultApi.list();
      setFiles(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Error loading files", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, []);

  const grouped = useMemo(() => {
    const g: Record<Category, VaultFile[]> = { images: [], audio: [], pdf: [], other: [] };
    for (const f of files) g[categoryOf(f)].push(f);
    return g;
  }, [files]);

  const confirmDelete = async () => {
    const file = pendingDelete;
    if (!file) return;
    setPendingDelete(null);
    try {
      await vaultApi.delete(file.id);
      invalidateVaultBlob(file.id);
      setFiles((cur) => cur.filter((f) => f.id !== file.id));
      applyUsageDelta({ vaultSizeMB: -Number((file.size / (1024 * 1024)).toFixed(2)) });
      toast({ title: "File deleted", description: file.fileName });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const pdfPreviewBlob = useBlobUrl(pdfPreview?.id ?? null);

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const vaultUsedMB = files.reduce((t, f) => t + f.size / (1024 * 1024), 0);
  const vaultMaxMB = limits.maxVaultSizeMB;
  const vaultPct = vaultMaxMB === -1 ? 0 : Math.min((vaultUsedMB / vaultMaxMB) * 100, 100);

  return (
    <AppLayout>
      <div className="px-6 lg:px-12 py-10 max-w-6xl mx-auto space-y-6">
        
        {/* HEADER MINIMALISTA SEM BOTÕES OU DISPARADORES DE UPLOAD */}
        <header className="border-b border-white/5 pb-6 mb-2">
          <div>
            <p className="text-[10px] tracking-wider uppercase text-neutral-500 font-semibold mb-1">Storage</p>
            <h1 className="font-serif text-4xl tracking-tight text-neutral-100">Vault</h1>
            <p className="mt-1 text-xs text-neutral-500">
              Browse and manage your stored files. Upload by dragging files directly into the Notes editor.
            </p>
          </div>
        </header>

        {/* INDICADOR DE ESPAÇO GLASSMORPHIC */}
        <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-4 space-y-3 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-neutral-400" />
              <span className="text-xs font-medium text-neutral-300">Storage Usage</span>
            </div>
            <span className="text-xs font-mono text-neutral-400">
              {vaultMaxMB === -1 ? `${vaultUsedMB.toFixed(1)} MB used` : `${vaultUsedMB.toFixed(1)} / ${vaultMaxMB} MB`}
            </span>
          </div>
          <Progress value={vaultMaxMB === -1 ? 0 : vaultPct} className="h-1 bg-white/5" />
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : files.length === 0 ? (
          /* EMPTY STATE LIMPO */
          <div className="text-center py-20 border border-dashed border-white/5 rounded-2xl bg-neutral-900/5 backdrop-blur-sm space-y-2">
            <HardDrive className="w-6 h-6 text-neutral-600 mx-auto mb-1" />
            <p className="text-neutral-300 font-medium text-sm">No files in Vault yet</p>
            <p className="text-neutral-500 text-xs max-w-xs mx-auto">M medias added inside your editor notes will automatically appear here.</p>
          </div>
        ) : (
          
          /* CONTROLE DE ABAS ESTILO NOTION DARK */
          <Tabs defaultValue="images" className="w-full">
            <TabsList className="flex w-full max-w-xl bg-neutral-900/40 border border-white/5 p-1 rounded-xl h-10 gap-0.5 backdrop-blur-md">
              <TabsTrigger value="images" className="flex-1 text-xs rounded-lg data-[state=active]:bg-white/5 data-[state=active]:text-white transition-all"><ImageIcon className="h-3.5 w-3.5 mr-1.5" />Photos ({grouped.images.length})</TabsTrigger>
              <TabsTrigger value="audio" className="flex-1 text-xs rounded-lg data-[state=active]:bg-white/5 data-[state=active]:text-white transition-all"><Music className="h-3.5 w-3.5 mr-1.5" />Audio ({grouped.audio.length})</TabsTrigger>
              <TabsTrigger value="pdf" className="flex-1 text-xs rounded-lg data-[state=active]:bg-white/5 data-[state=active]:text-white transition-all"><FileText className="h-3.5 w-3.5 mr-1.5" />PDFs ({grouped.pdf.length})</TabsTrigger>
              <TabsTrigger value="other" className="flex-1 text-xs rounded-lg data-[state=active]:bg-white/5 data-[state=active]:text-white transition-all"><FileGeneric className="h-3.5 w-3.5 mr-1.5" />Other ({grouped.other.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="images" className="mt-6 outline-none">
              {grouped.images.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-12 border border-dashed border-white/5 rounded-xl">No images stored.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {grouped.images.map((f) => (
                    <ImageThumb key={f.id} file={f} onDelete={setPendingDelete} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="audio" className="mt-6 outline-none">
              {grouped.audio.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-12 border border-dashed border-white/5 rounded-xl">No audio files stored.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {grouped.audio.map((f) => (
                    <AudioPlayer key={f.id} file={f} onDelete={setPendingDelete} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="pdf" className="mt-6 outline-none">
              {grouped.pdf.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-12 border border-dashed border-white/5 rounded-xl">No PDF files stored.</p>
              ) : (
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                  {grouped.pdf.map((f) => (
                    <PdfCard key={f.id} file={f} onDelete={setPendingDelete} onOpen={setPdfPreview} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="other" className="mt-6 outline-none">
              {grouped.other.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-12 border border-dashed border-white/5 rounded-xl">No other files stored.</p>
              ) : (
                <div className="space-y-2">
                  {grouped.other.map((f) => (
                    <OtherFileRow key={f.id} file={f} onDelete={setPendingDelete} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* ALERT DIALOG DE EXCLUSÃO */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent className="bg-neutral-950 border border-white/10 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-neutral-100">Delete file?</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400 text-xs">
              The file <span className="text-neutral-200 font-medium">{pendingDelete?.fileName}</span> will be permanently removed from your vault. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent hover:bg-white/5 text-neutral-300 border-white/10 rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PREVIEW EXPANDIDO DE PDF */}
      {pdfPreview && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md flex flex-col animate-in fade-in duration-200" onClick={() => setPdfPreview(null)}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-neutral-950/40 backdrop-blur-xl text-white">
            <p className="text-sm font-medium truncate max-w-xl">{pdfPreview.fileName}</p>
            <Button size="sm" variant="ghost" onClick={() => setPdfPreview(null)} className="text-neutral-400 hover:text-white rounded-lg hover:bg-white/5">Close</Button>
          </div>
          <div className="flex-1 p-6" onClick={(e) => e.stopPropagation()}>
            {pdfPreviewBlob.url ? (
              <iframe src={pdfPreviewBlob.url} title={pdfPreview.fileName} className="w-full h-full bg-neutral-900 border border-white/10 rounded-xl shadow-2xl" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
