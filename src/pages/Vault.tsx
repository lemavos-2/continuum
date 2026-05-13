import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
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
  Loader2, HardDrive, Upload, Trash2, Music, ExternalLink,
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
    <div className="group relative rounded-xl overflow-hidden border border-border/60 bg-muted/30 aspect-square">
      {error ? (
        <div className="flex items-center justify-center h-full text-xs text-destructive">Failed</div>
      ) : url ? (
        <img src={url} alt={file.fileName} className="w-full h-full object-cover" />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-[11px] text-white truncate">{file.fileName}</p>
        <p className="text-[10px] text-white/70">{formatSize(file.size)}</p>
      </div>
      <Button
        type="button"
        size="icon"
        variant="destructive"
        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
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
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Music className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{file.fileName}</p>
          <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
        </div>
        <Button type="button" size="icon" variant="ghost" onClick={() => onDelete(file)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-destructive">Failed to load audio</p>
      ) : url ? (
        <audio src={url} controls className="w-full" />
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading…
        </div>
      )}
    </div>
  );
}

function PdfCard({ file, onDelete, onOpen }: { file: VaultFile; onDelete: (f: VaultFile) => void; onOpen: (f: VaultFile) => void }) {
  const { url, error } = useBlobUrl(file.id);
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 overflow-hidden flex flex-col">
      <button type="button" onClick={() => onOpen(file)} className="aspect-[3/4] bg-white relative overflow-hidden">
        {error ? (
          <div className="flex items-center justify-center h-full text-xs text-destructive">Failed</div>
        ) : url ? (
          <iframe src={`${url}#toolbar=0&navpanes=0`} title={file.fileName} className="w-full h-full pointer-events-none" />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </button>
      <div className="p-3 flex items-center gap-2 border-t border-border/60">
        <FileText className="h-4 w-4 text-primary shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{file.fileName}</p>
          <p className="text-[11px] text-muted-foreground">{formatSize(file.size)}</p>
        </div>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => onOpen(file)}>
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(file)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function OtherFileRow({ file, onDelete }: { file: VaultFile; onDelete: (f: VaultFile) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors">
      <div className="bento-icon-box shrink-0">
        <FileGeneric className="w-4 h-4 text-gray-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{file.fileName}</p>
        <p className="text-xs text-muted-foreground">
          {formatSize(file.size)} · {new Date(file.createdAt).toLocaleDateString()}
        </p>
      </div>
      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(file)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function Vault() {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<VaultFile | null>(null);
  const [pdfPreview, setPdfPreview] = useState<VaultFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { loading: authLoading } = useRequireAuth();
  const { canUploadVault, applyUsageDelta } = usePlanGate();
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

  const uploadFile = async (file: File) => {
    const fileSizeMB = file.size / (1024 * 1024);
    if (!canUploadVault(fileSizeMB)) {
      toast({ title: "Upload blocked", description: "You have reached your vault storage limit.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await vaultApi.upload(form);
      setFiles((current) => [...current, response.data]);
      applyUsageDelta({ vaultSizeMB: Number(fileSizeMB.toFixed(2)) });
      toast({ title: "Upload complete", description: `${file.name} added to your vault.` });
    } catch (error: any) {
      let msg = "Upload failed";
      if (error?.response?.status === 415) msg = "File type not supported. Allowed: JPG, PNG, WEBP, PDF, MP3, M4A.";
      else if (error?.response?.status === 400) msg = "File exceeds limit or vault is full.";
      toast({ title: "Upload failed", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    await uploadFile(file);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const dropped = e.dataTransfer.files;
    if (dropped && dropped.length > 0) await uploadFile(dropped[0]);
  };

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
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const vaultUsedMB = files.reduce((t, f) => t + f.size / (1024 * 1024), 0);
  const vaultMaxMB = limits.maxVaultSizeMB;
  const vaultPct = vaultMaxMB === -1 ? 0 : Math.min((vaultUsedMB / vaultMaxMB) * 100, 100);

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Vault</h1>
            <p className="text-sm text-muted-foreground mt-1">Secure storage for images, PDFs, and audio.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,application/pdf,audio/mpeg,audio/mp4,audio/x-m4a,audio/m4a"
              onChange={handleFileSelected}
            />
            <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading || !canUploadVault(0)} className="inline-flex items-center gap-2">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {canUploadVault(0) ? "Upload file" : "Storage full"}
            </Button>
          </div>
        </div>

        <div className="bento-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium">Storage</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {vaultMaxMB === -1 ? `${vaultUsedMB.toFixed(1)} MB used` : `${vaultUsedMB.toFixed(1)} / ${vaultMaxMB} MB`}
            </span>
          </div>
          <Progress value={vaultMaxMB === -1 ? 0 : vaultPct} className="h-1" />
        </div>

        <div
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          className={`rounded-xl border-2 border-dashed transition-all ${
            dragActive ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50"
          } p-6 text-center`}
        >
          <Upload className={`w-6 h-6 mx-auto ${dragActive ? "text-primary" : "text-muted-foreground/50"}`} />
          <p className="text-sm mt-2">{dragActive ? "Drop your file here" : "Drag a file here or use the upload button"}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <HardDrive className="w-8 h-8 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground text-sm">No files in Vault yet.</p>
          </div>
        ) : (
          <Tabs defaultValue="images" className="w-full">
            <TabsList className="grid grid-cols-4 w-full max-w-xl">
              <TabsTrigger value="images"><ImageIcon className="h-3.5 w-3.5 mr-1.5" />Photos ({grouped.images.length})</TabsTrigger>
              <TabsTrigger value="audio"><Music className="h-3.5 w-3.5 mr-1.5" />Audio ({grouped.audio.length})</TabsTrigger>
              <TabsTrigger value="pdf"><FileText className="h-3.5 w-3.5 mr-1.5" />PDFs ({grouped.pdf.length})</TabsTrigger>
              <TabsTrigger value="other"><FileGeneric className="h-3.5 w-3.5 mr-1.5" />Other ({grouped.other.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="images" className="mt-4">
              {grouped.images.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No images.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {grouped.images.map((f) => (
                    <ImageThumb key={f.id} file={f} onDelete={setPendingDelete} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="audio" className="mt-4">
              {grouped.audio.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No audio files.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {grouped.audio.map((f) => (
                    <AudioPlayer key={f.id} file={f} onDelete={setPendingDelete} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="pdf" className="mt-4">
              {grouped.pdf.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No PDFs.</p>
              ) : (
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                  {grouped.pdf.map((f) => (
                    <PdfCard key={f.id} file={f} onDelete={setPendingDelete} onOpen={setPdfPreview} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="other" className="mt-4">
              {grouped.other.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No other files.</p>
              ) : (
                <div className="space-y-1">
                  {grouped.other.map((f) => (
                    <OtherFileRow key={f.id} file={f} onDelete={setPendingDelete} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.fileName} will be permanently removed from your vault. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {pdfPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col" onClick={() => setPdfPreview(null)}>
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <p className="text-sm font-medium truncate">{pdfPreview.fileName}</p>
            <Button size="sm" variant="ghost" onClick={() => setPdfPreview(null)} className="text-white hover:text-white">Close</Button>
          </div>
          <div className="flex-1 px-4 pb-4" onClick={(e) => e.stopPropagation()}>
            {pdfPreviewBlob.url ? (
              <iframe src={pdfPreviewBlob.url} title={pdfPreview.fileName} className="w-full h-full bg-white rounded-lg" />
            ) : (
              <div className="flex items-center justify-center h-full text-white">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
