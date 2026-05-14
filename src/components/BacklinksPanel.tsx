import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { StickyNote, Link2, Unlink } from "lucide-react";
import { notesApi } from "@/lib/api";

interface BacklinkItem {
  id: string;
  title: string;
  snippet?: string;
}

interface BacklinksData {
  linkedMentions: BacklinkItem[];
  unlinkedMentions: BacklinkItem[];
}

interface BacklinksPanelProps {
  noteId: string;
}

export function BacklinksPanel({ noteId }: BacklinksPanelProps) {
  const [data, setData] = useState<BacklinksData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!noteId) return;
    setLoading(true);
    notesApi
      .getBacklinks(noteId)
      .then((res) => {
        setData({
          linkedMentions: Array.isArray(res.data?.linkedMentions) ? res.data.linkedMentions : [],
          unlinkedMentions: Array.isArray(res.data?.unlinkedMentions) ? res.data.unlinkedMentions : [],
        });
      })
      .catch(() => {
        setData({ linkedMentions: [], unlinkedMentions: [] });
      })
      .finally(() => setLoading(false));
  }, [noteId]);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-4 w-28 mt-4" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const linked = data?.linkedMentions || [];
  const unlinked = data?.unlinkedMentions || [];
  const isEmpty = linked.length === 0 && unlinked.length === 0;

  return (
    <div className="space-y-5 p-4">
      {isEmpty && (
        <div className="text-center py-8 space-y-2">
          <Unlink className="w-5 h-5 text-muted-foreground/30 mx-auto" />
          <p className="text-xs text-muted-foreground">
            No connections found
          </p>
        </div>
      )}

      {linked.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <Link2 className="w-3 h-3" />
            Linked Mentions
          </div>
          <div className="space-y-1">
            {linked.map((item) => (
              <Link
                key={item.id}
                to={`/notes/${item.id}`}
                className="flex items-start gap-2 px-2 py-2 rounded-md hover:bg-accent transition-colors group"
              >
                <StickyNote className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  {item.snippet && (
                    <p className="text-xs text-muted-foreground truncate">
                      {item.snippet}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {unlinked.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <Unlink className="w-3 h-3" />
            Unlinked Mentions
          </div>
          <div className="space-y-1">
            {unlinked.map((item) => (
              <Link
                key={item.id}
                to={`/notes/${item.id}`}
                className="flex items-start gap-2 px-2 py-2 rounded-md hover:bg-accent transition-colors group"
              >
                <StickyNote className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  {item.snippet && (
                    <p className="text-xs text-muted-foreground truncate">
                      {item.snippet}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
