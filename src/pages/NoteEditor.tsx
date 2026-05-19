import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { entitiesApi, notesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, Save, Loader2, Check, PanelRight, 
  Settings2, ImageIcon, FileText, X, Clock,
  MoreVertical
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TiptapEditor, type TiptapEditorHandle } from "@/components/TiptapEditor";
import { BacklinksPanel } from "@/components/BacklinksPanel";
import { extractMentionIds, parseTiptapContent, sanitizeTiptapMentions } from "@/lib/tiptap-content";

interface NoteData {
  id: string;
  title: string;
  content: any;
  type?: string;
  folderId?: string;
  entityIds: string[];
  createdAt: string;
  updatedAt: string;
}

export default function NoteEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const editorRef = useRef<TiptapEditorHandle>(null);

  const [note, setNote] = useState<NoteData | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("");
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [showBacklinks, setShowBacklinks] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJSON = useRef<string>("");
  const lastSavedTitle = useRef<string>("");
  const lastSavedType = useRef<string>("");
  const currentJSON = useRef<any>(null);

  // Load note
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    Promise.allSettled([notesApi.get(id), entitiesApi.list(), notesApi.getTypes()])
      .then(([noteResult, entitiesResult, typesResult]) => {
        if (noteResult.status !== "fulfilled") throw noteResult.reason;
        if (cancelled) return;

        const data = noteResult.value.data as NoteData;
        const parsedContent = parseTiptapContent(data.content);
        const userEntities =
          entitiesResult.status === "fulfilled" && Array.isArray(entitiesResult.value.data)
            ? entitiesResult.value.data
            : null;
        
        const sanitized = userEntities
          ? sanitizeTiptapMentions(parsedContent, userEntities)
          : { doc: parsedContent, entityIds: extractMentionIds(parsedContent), changed: false, removedIds: [] };
        
        const normalizedContent = sanitized.doc;

        if (typesResult.status === "fulfilled" && Array.isArray(typesResult.value.data)) {
          setAvailableTypes(typesResult.value.data);
        }

        setNote({
          ...data,
          content: normalizedContent,
          entityIds: sanitized.entityIds,
        });
        setTitle(data.title);
        setType(data.type || "");
        lastSavedTitle.current = data.title;
        lastSavedType.current = data.type || "";
        currentJSON.current = sanitized.doc;
        lastSavedJSON.current = JSON.stringify(normalizedContent);

        if (sanitized.changed) {
          void notesApi.update(id, {
            title: data.title,
            content: normalizedContent,
            entityIds: sanitized.entityIds,
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        toast({ title: "Note not found", variant: "destructive" });
        navigate("/notes");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [id, navigate, toast]);

  const doSave = useCallback(async (t: string, json: any, newType: string) => {
    if (!id) return;
    const jsonStr = JSON.stringify(json);
    if (t === lastSavedTitle.current && jsonStr === lastSavedJSON.current && newType === lastSavedType.current) return;

    setSaveStatus("saving");
    try {
      const entityIds = extractMentionIds(json);
      await notesApi.update(id, {
        title: t,
        content: json,
        entityIds,
        type: newType,
      });
      lastSavedTitle.current = t;
      lastSavedJSON.current = jsonStr;
      lastSavedType.current = newType;
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error: any) {
      setSaveStatus("idle");
      if (error?.response?.status === 401) {
        toast({ title: "Session expired", variant: "destructive" });
      } else {
        toast({ title: "Error saving note", variant: "destructive" });
      }
    }
  }, [id, toast]);

  const scheduleAutoSave = useCallback((t: string, json: any, newType: string) => {
    if (!autoSaveEnabled) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => doSave(t, json, newType), 1500);
  }, [doSave, autoSaveEnabled]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    scheduleAutoSave(val, currentJSON.current, type);
  };

  const handleTypeChange = (val: string) => {
    setType(val);
    scheduleAutoSave(title, currentJSON.current, val);
  };

  const handleEditorChange = useCallback((json: any) => {
    currentJSON.current = json;
    scheduleAutoSave(title, json, type);
  }, [title, type, scheduleAutoSave]);

  const handleManualSave = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const json = editorRef.current?.getJSON() || currentJSON.current;
    await doSave(title, json, type);
    toast({ title: "Note saved!" });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] bg-background">
        
        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          
          {/* Top Toolbar */}
          <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-background/95 backdrop-blur z-10 shrink-0">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate("/notes")} className="text-muted-foreground hover:text-foreground w-8 h-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              
              <div className="h-4 w-[1px] bg-border mx-2" />
              
              {/* Status Indicator */}
              <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full">
                {saveStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>}
                {saveStatus === "saved" && <><Check className="w-3 h-3 text-emerald-400" /> Saved</>}
                {saveStatus === "idle" && <><FileText className="w-3 h-3" /> Ready</>}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground" onClick={() => editorRef.current?.triggerUpload()} title="Attach Media">
                <ImageIcon className="w-4 h-4" />
              </Button>

              {/* Note Settings Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground">
                    <Settings2 className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl rounded-2xl" align="end">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm text-foreground mb-1">Properties</h4>
                      <p className="text-xs text-muted-foreground">Manage note metadata and settings.</p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Note Type</Label>
                        <div className="flex gap-2">
                          {availableTypes.length > 0 && (
                            <Select value={type} onValueChange={handleTypeChange}>
                              <SelectTrigger className="flex-1 bg-white/5 border-white/10 h-8 text-xs">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableTypes.map((t) => (
                                  <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <Input
                            value={type}
                            onChange={(e) => handleTypeChange(e.target.value)}
                            placeholder="Or new..."
                            className="flex-1 bg-white/5 border-white/10 h-8 text-xs"
                            maxLength={50}
                          />
                          {type && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive" onClick={() => handleTypeChange("")}>
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <Label htmlFor="auto-save" className="text-xs text-foreground cursor-pointer">Auto Save</Label>
                        <Switch id="auto-save" checked={autoSaveEnabled} onCheckedChange={setAutoSaveEnabled} className="scale-75 origin-right" />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button variant="ghost" size="icon" className={`w-8 h-8 transition-colors ${showBacklinks ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setShowBacklinks(!showBacklinks)} title="Toggle Side Panel">
                <PanelRight className="w-4 h-4" />
              </Button>
            </div>
          </header>

          {/* Editor Canvas */}
          <div className="flex-1 overflow-y-auto scroll-smooth">
            <div className="max-w-[750px] mx-auto w-full px-6 py-12 lg:px-12 pb-32">
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Untitled Note"
                className="text-4xl font-display font-bold border-0 px-0 focus-visible:ring-0 bg-transparent text-foreground mb-8 h-auto placeholder:text-muted-foreground/30"
              />

              {currentJSON.current && (
                <div className="prose prose-invert prose-p:leading-relaxed prose-headings:font-display max-w-none">
                  <TiptapEditor
                    ref={editorRef}
                    content={currentJSON.current}
                    onChange={handleEditorChange}
                    currentNoteId={note?.id}
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Footer Metadata */}
          {note?.updatedAt && (
            <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-[10px] text-muted-foreground bg-background/80 backdrop-blur px-2 py-1 rounded-md border border-white/5">
              <Clock className="w-3 h-3" />
              Edited {new Date(note.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>

        {/* Backlinks Sidebar */}
        <aside className={`shrink-0 border-l border-white/5 bg-black/40 backdrop-blur-xl transition-all duration-300 ease-in-out overflow-hidden flex flex-col
          ${showBacklinks ? "w-80 opacity-100" : "w-0 opacity-0 border-none"}`}>
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4 shrink-0">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Context</p>
              <h3 className="mt-0.5 text-sm font-medium text-foreground">Linked Mentions</h3>
            </div>
            <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-foreground" onClick={() => setShowBacklinks(false)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {id && <BacklinksPanel noteId={id} />}
          </div>
        </aside>

      </div>
    </AppLayout>
  );
}
