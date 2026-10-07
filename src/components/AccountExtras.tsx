import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, vaultApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useUsage } from "@/contexts/UsageContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "@/lib/heroicons";
import type { VaultFile } from "@/types";

type Lang = "en" | "es" | "pt" | "fr";
const S = {
  en: { pick: "Insert from vault", empty: "Your vault is empty.", delTitle: "Account scheduled for deletion", delDesc: "Everything will be permanently erased on {d}.", cancel: "Cancel deletion", usage: "Plan usage", notes: "Notes", entities: "Entities", vault: "Vault", near: "You're close to your plan limit", nearDesc: "{x} is at {p}% of your limit.", upgrade: "See plans", deleteAccount: "Delete account", deleteAccountDesc: "Everything is erased after 7 days. You can cancel until then.", deleteConfirm: "Your account and all data will be permanently deleted in 7 days. You can cancel anytime before that.", canceled: "Deletion canceled" },
  es: { pick: "Insertar desde el cofre", empty: "Tu cofre está vacío.", delTitle: "Cuenta programada para eliminación", delDesc: "Todo se borrará permanentemente el {d}.", cancel: "Cancelar eliminación", usage: "Uso del plan", notes: "Notas", entities: "Entidades", vault: "Cofre", near: "Estás cerca del límite de tu plan", nearDesc: "{x} está al {p}% del límite.", upgrade: "Ver planes", deleteAccount: "Eliminar cuenta", deleteAccountDesc: "Todo se borra tras 7 días. Puedes cancelar hasta entonces.", deleteConfirm: "Tu cuenta y todos los datos se eliminarán en 7 días. Puedes cancelar antes.", canceled: "Eliminación cancelada" },
  pt: { pick: "Inserir do cofre", empty: "Seu cofre está vazio.", delTitle: "Conta agendada para exclusão", delDesc: "Tudo será apagado definitivamente em {d}.", cancel: "Cancelar exclusão", usage: "Uso do plano", notes: "Notas", entities: "Entidades", vault: "Cofre", near: "Você está perto do limite do plano", nearDesc: "{x} está em {p}% do limite.", upgrade: "Ver planos", deleteAccount: "Excluir conta", deleteAccountDesc: "Tudo é apagado após 7 dias. Você pode cancelar até lá.", deleteConfirm: "Sua conta e todos os dados serão apagados definitivamente em 7 dias. Você pode cancelar antes disso.", canceled: "Exclusão cancelada" },
  fr: { pick: "Insérer depuis le coffre", empty: "Votre coffre est vide.", delTitle: "Compte programmé pour suppression", delDesc: "Tout sera définitivement effacé le {d}.", cancel: "Annuler la suppression", usage: "Utilisation du forfait", notes: "Notes", entities: "Entités", vault: "Coffre", near: "Vous approchez de la limite", nearDesc: "{x} est à {p}% de la limite.", upgrade: "Voir les forfaits", deleteAccount: "Supprimer le compte", deleteAccountDesc: "Tout est effacé après 7 jours. Annulable d'ici là.", deleteConfirm: "Votre compte et toutes les données seront supprimés dans 7 jours. Vous pouvez annuler avant.", canceled: "Suppression annulée" },
};
export function useExtrasText() {
  const { language } = useLanguage();
  return S[(language as Lang) in S ? (language as Lang) : "en"];
}

export function VaultPicker() {
  const s = useExtrasText();
  const [editor, setEditor] = useState<Editor | null>(null);
  useEffect(() => {
    const h = (e: Event) => setEditor((e as CustomEvent).detail?.editor ?? null);
    window.addEventListener("continuum:vault-pick", h);
    return () => window.removeEventListener("continuum:vault-pick", h);
  }, []);
  const { data, isLoading } = useQuery({ queryKey: ["vault", "files", "picker"], queryFn: () => vaultApi.list().then((r) => r.data as VaultFile[]), enabled: !!editor });
  const insert = (f: VaultFile) => {
    if (!editor) return;
    const ct = f.contentType || "";
    const node = ct.startsWith("image/") ? { type: "vaultImage", attrs: { vaultId: f.id, alt: f.fileName } }
      : ct === "application/pdf" ? { type: "vaultPdf", attrs: { vaultId: f.id, fileName: f.fileName } }
      : ct.startsWith("audio/") ? { type: "vaultAudio", attrs: { vaultId: f.id, fileName: f.fileName } }
      : { type: "text", text: f.fileName, marks: [{ type: "link", attrs: { href: `/vault/download/${encodeURIComponent(f.id)}` } }] };
    editor.chain().focus().insertContent([node, { type: "paragraph" }]).run();
    setEditor(null);
  };
  return (
    <Dialog open={!!editor} onOpenChange={(o) => !o && setEditor(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{s.pick}</DialogTitle></DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto -mx-2">
          {isLoading ? <div className="flex justify-center p-6"><Loader2 className="h-4 w-4 animate-spin" /></div>
            : !data?.length ? <p className="p-6 text-center text-sm text-muted-foreground">{s.empty}</p>
            : data.map((f) => (
              <button key={f.id} type="button" onClick={() => insert(f)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-foreground/5">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{f.fileName}</span>
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useDeletionStatus() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["account", "deletion"], queryFn: () => authApi.deletionStatus().then((r) => r.data as { scheduled?: boolean; purgeAt?: string; deletionRequestedAt?: string }), enabled: !!user, staleTime: 60_000 });
}

export function DeletionBanner() {
  const s = useExtrasText();
  const qc = useQueryClient();
  const { data } = useDeletionStatus();
  const [busy, setBusy] = useState(false);
  const at = data?.purgeAt ?? (data?.deletionRequestedAt ? new Date(new Date(data.deletionRequestedAt).getTime() + 7 * 864e5).toISOString() : null);
  if (!data || (!data.scheduled && !data.deletionRequestedAt)) return null;
  return (
    <div className="fixed inset-x-3 top-3 z-50 mx-auto max-w-lg rounded-xl border border-destructive/30 bg-background/95 p-3 shadow-lg backdrop-blur-sm">
      <p className="text-sm font-medium text-destructive">{s.delTitle}</p>
      {at && <p className="mt-0.5 text-xs text-muted-foreground">{s.delDesc.replace("{d}", new Date(at).toLocaleDateString())}</p>}
      <Button size="sm" variant="outline" className="mt-2" disabled={busy} onClick={async () => { setBusy(true); try { await authApi.cancelDeletion(); await qc.invalidateQueries({ queryKey: ["account", "deletion"] }); } finally { setBusy(false); } }}>{s.cancel}</Button>
    </div>
  );
}

/** Real usage bars. `alertOnly` renders only a warning card when any limit is >= 80%. */
export function UsageCard({ alertOnly = false }: { alertOnly?: boolean }) {
  const s = useExtrasText();
  const { user } = useAuth();
  const { usage } = useUsage();
  if (!user || !usage) return null;
  const rows = [
    { label: s.notes, used: usage.notesCount, max: user.maxNotes, unit: "" },
    { label: s.entities, used: usage.entitiesCount, max: user.maxEntities, unit: "" },
    { label: s.vault, used: usage.vaultSizeMB, max: user.maxVaultSizeMB, unit: " MB" },
  ].map((r) => ({ ...r, pct: r.max && r.max > 0 ? Math.min(100, Math.round((r.used / r.max) * 100)) : 0, unlimited: !r.max || r.max < 0 }));
  const hot = rows.filter((r) => !r.unlimited && r.pct >= 80).sort((a, b) => b.pct - a.pct)[0];
  if (alertOnly) {
    if (!hot) return null;
    return (
      <a href="/pricing" className="mb-5 block rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <p className="text-sm font-medium text-foreground">{s.near}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{s.nearDesc.replace("{x}", hot.label).replace("{p}", String(hot.pct))} · {s.upgrade}</p>
      </a>
    );
  }
  return (
    <div className="space-y-3 rounded-xl border border-border/10 p-4">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-xs text-muted-foreground"><span>{r.label}</span><span className="font-mono">{Math.round(r.used * 10) / 10}{r.unit} / {r.unlimited ? "∞" : `${r.max}${r.unit}`}</span></div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10">
            <div className={r.pct >= 80 ? "h-full bg-amber-500" : "h-full bg-primary"} style={{ width: `${r.unlimited ? 0 : r.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
