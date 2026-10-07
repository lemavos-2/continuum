import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { trashApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "@/lib/heroicons";

type Item = { id: string; kind: string; title: string; subtype?: string; deletedAt: string; expiresAt: string };
const T = {
  en: { title: "Trash", sub: "Deleted notes and entities stay here for 30 days.", empty: "Trash is empty.", restore: "Restore", del: "Delete forever", all: "Empty trash", left: "{n} days left", note: "Note", entity: "Entity", ok: "Restored" },
  es: { title: "Papelera", sub: "Las notas y entidades eliminadas quedan aquí 30 días.", empty: "La papelera está vacía.", restore: "Restaurar", del: "Eliminar para siempre", all: "Vaciar papelera", left: "Quedan {n} días", note: "Nota", entity: "Entidad", ok: "Restaurado" },
  pt: { title: "Lixeira", sub: "Notas e entidades excluídas ficam aqui por 30 dias.", empty: "A lixeira está vazia.", restore: "Restaurar", del: "Excluir para sempre", all: "Esvaziar lixeira", left: "{n} dias restantes", note: "Nota", entity: "Entidade", ok: "Restaurado" },
  fr: { title: "Corbeille", sub: "Les notes et entités supprimées restent ici 30 jours.", empty: "La corbeille est vide.", restore: "Restaurer", del: "Supprimer définitivement", all: "Vider la corbeille", left: "{n} jours restants", note: "Note", entity: "Entité", ok: "Restauré" },
};

export default function Trash() {
  const { language } = useLanguage();
  const s = T[(language as keyof typeof T)] ?? T.en;
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: ["trash"], queryFn: () => trashApi.list().then((r) => r.data as Item[]) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["trash"] }); qc.invalidateQueries({ queryKey: ["notes"] }); qc.invalidateQueries({ queryKey: ["entities"] }); };
  const act = async (fn: () => Promise<unknown>, msg?: string) => {
    try { await fn(); if (msg) toast({ title: msg }); } catch (e: any) { toast({ title: e?.response?.data?.message ?? "Error", variant: "destructive" }); }
    refresh();
  };
  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-foreground">{s.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{s.sub}</p>
          </div>
          {!!data?.length && <Button variant="outline" size="sm" onClick={() => act(() => trashApi.empty())}>{s.all}</Button>}
        </div>
        {isLoading ? <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
          : !data?.length ? <p className="rounded-xl border border-border/10 p-10 text-center text-sm text-muted-foreground">{s.empty}</p>
          : <ul className="divide-y divide-border/10 rounded-xl border border-border/10">
            {data.map((it) => {
              const days = Math.max(0, Math.ceil((new Date(it.expiresAt).getTime() - Date.now()) / 864e5));
              return (
                <li key={it.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{it.title || "—"}</p>
                    <p className="text-xs text-muted-foreground">{it.kind === "NOTE" ? s.note : s.entity}{it.subtype ? ` · ${it.subtype}` : ""} · {s.left.replace("{n}", String(days))}</p>
                  </div>
                  <Button size="sm" onClick={() => act(() => trashApi.restore(it.id), s.ok)}>{s.restore}</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => act(() => trashApi.purge(it.id))}>{s.del}</Button>
                </li>
              );
            })}
          </ul>}
      </div>
    </AppLayout>
  );
}
