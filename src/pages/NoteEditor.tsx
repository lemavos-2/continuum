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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Loader2, Check, PanelRight, PanelRightClose, Settings, Paperclip } from "lucide-react";
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
  const [configOpen, setConfigOpen] = useState(false);

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
        if (noteResult.status !== "fulfilled") {
          throw noteResult.reason;
        }

        if (cancelled) {
          return;
        }

        const data = noteResult.value.data as NoteData;
        const parsedContent = parseTiptapContent(data.content);
        const userEntities =
          entitiesResult.status === "fulfilled" && Array.isArray(entitiesResult.value.data)
            ? entitiesResult.value.data
            : null;
        const sanitized = userEntities
          ? sanitizeTiptapMentions(parsedContent, userEntities)
          : {
              doc: parsedContent,
              entityIds: extractMentionIds(parsedContent),
              changed: false,
              removedIds: [],
            };
        const normalizedContent = sanitized.doc;

        // Load available types
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
        if (cancelled) {
          return;
        }
        toast({ title: "Note not found", variant: "destructive" });
        navigate("/notes");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [id, navigate, toast]);

  const doSave = useCallback(
    async (t: string, json: any, newType: string) => {
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
    },
    [id, toast]
  );

  const scheduleAutoSave = useCallback(
    (t: string, json: any, newType: string) => {
      if (!autoSaveEnabled) return;
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => doSave(t, json, newType), 1500);
    },
    [doSave, autoSaveEnabled]
  );

  const handleTitleChange = (val: string) => {
    setTitle(val);
    scheduleAutoSave(val, currentJSON.current, type);
  };

  const handleTypeChange = (val: string) => {
    setType(val);
    scheduleAutoSave(title, currentJSON.current, val);
  };

  const handleEditorChange = useCallback(
    (json: any) => {
      currentJSON.current = json;
      scheduleAutoSave(title, json, type);
    },
    [title, type, scheduleAutoSave]
  );

  const handleManualSave = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const json = editorRef.current?.getJSON() || currentJSON.current;
    await doSave(title, json, type);
    toast({ title: "Note saved!" });
  };

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Main editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/notes")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="flex items-center gap-2">
              {/* Save status */}
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                {saveStatus === "saving" && (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                  </>
                )}
                {saveStatus === "saved" && (
                  <>
                    <Check className="w-3 h-3 text-primary" /> Saved
                  </>
                )}
              </div>
              <Dialog open={configOpen} onOpenChange={setConfigOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Note Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="note-type">Note Type (optional)</Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          {availableTypes.length > 0 ? (
                            <Select value={type} onValueChange={handleTypeChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a type..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableTypes.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : null}
                        </div>
                        <div className="flex-1">
                          <Input
                            value={type}
                            onChange={(e) => handleTypeChange(e.target.value)}
                            placeholder="Or create new..."
                            maxLength={100}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="auto-save">Auto Save</Label>
                        <p className="text-sm text-muted-foreground">Automatically save changes every few seconds</p>
                      </div>
                      <Switch
                        id="auto-save"
                        checked={autoSaveEnabled}
                        onCheckedChange={setAutoSaveEnabled}
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBacklinks(!showBacklinks)}
                className="text-muted-foreground hover:text-foreground"
              >
                {showBacklinks ? (
                  <PanelRightClose className="w-4 h-4" />
                ) : (
                  <PanelRight className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editorRef.current?.triggerUpload()}
                className="text-muted-foreground hover:text-foreground"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={handleManualSave}
                disabled={saveStatus === "saving"}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Save className="w-4 h-4 mr-1" /> Save
              </Button>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-auto px-4 lg:px-16 py-6 max-w-3xl mx-auto w-full">
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Note title..."
              className="text-2xl font-display font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent text-foreground mb-4 h-auto"
            />

            {currentJSON.current && (
              <TiptapEditor
                ref={editorRef}
                content={currentJSON.current}
                onChange={handleEditorChange}
                currentNoteId={note?.id}
              />
            )}
          </div>

          {/* Footer save status */}
          <div className="px-4 py-1.5 border-t border-border/30 shrink-0 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {note?.updatedAt
                ? `Last edit: ${new Date(note.updatedAt).toLocaleString("en-US")}`
                : ""}
            </span>
            <span className="flex items-center gap-1">
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> Saving...
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <Check className="w-2.5 h-2.5" /> Saved
                </>
              )}
              {saveStatus === "idle" && "Ready"}
            </span>
          </div>
        </div>

        {/* Backlinks panel (right column) */}
        {showBacklinks && id && (
          <div className="w-72 border-l border-border/50 bg-card/50 overflow-auto hidden lg:block shrink-0">
            <div className="px-4 py-3 border-b border-border/50">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Backlinks
              </h3>
            </div>
            <BacklinksPanel noteId={id} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
