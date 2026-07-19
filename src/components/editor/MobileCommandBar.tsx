import { useEffect, useState, useCallback } from "react";
import type { Editor } from "@tiptap/core";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Code2,
  Minus,
  Type,
  Bold,
  Italic,
  Strikethrough,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  X,
} from "@/lib/heroicons";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface Props {
  editor: Editor | null;
}

interface Cmd {
  key: string;
  label: string;
  icon: typeof Type;
  run: (e: Editor) => void;
  active?: (e: Editor) => boolean;
}

const COMMANDS: Cmd[] = [
  { key: "text", label: "Text", icon: Type, run: (e) => e.chain().focus().setNode("paragraph").run() },
  { key: "h1", label: "H1", icon: Heading1, run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(), active: (e) => e.isActive("heading", { level: 1 }) },
  { key: "h2", label: "H2", icon: Heading2, run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), active: (e) => e.isActive("heading", { level: 2 }) },
  { key: "h3", label: "H3", icon: Heading3, run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(), active: (e) => e.isActive("heading", { level: 3 }) },
  { key: "bold", label: "Bold", icon: Bold, run: (e) => e.chain().focus().toggleBold().run(), active: (e) => e.isActive("bold") },
  { key: "italic", label: "Italic", icon: Italic, run: (e) => e.chain().focus().toggleItalic().run(), active: (e) => e.isActive("italic") },
  { key: "strike", label: "Strike", icon: Strikethrough, run: (e) => e.chain().focus().toggleStrike().run(), active: (e) => e.isActive("strike") },
  { key: "ul", label: "List", icon: List, run: (e) => e.chain().focus().toggleBulletList().run(), active: (e) => e.isActive("bulletList") },
  { key: "ol", label: "1. List", icon: ListOrdered, run: (e) => e.chain().focus().toggleOrderedList().run(), active: (e) => e.isActive("orderedList") },
  { key: "task", label: "To-do", icon: ListTodo, run: (e) => e.chain().focus().toggleTaskList().run(), active: (e) => e.isActive("taskList") },
  { key: "quote", label: "Quote", icon: Quote, run: (e) => e.chain().focus().toggleBlockquote().run(), active: (e) => e.isActive("blockquote") },
  { key: "code", label: "Code", icon: Code, run: (e) => e.chain().focus().toggleCode().run(), active: (e) => e.isActive("code") },
  { key: "codeblock", label: "Block", icon: Code2, run: (e) => e.chain().focus().toggleCodeBlock().run(), active: (e) => e.isActive("codeBlock") },
  { key: "hr", label: "Divider", icon: Minus, run: (e) => e.chain().focus().setHorizontalRule().run() },
  {
    key: "link",
    label: "Link",
    icon: LinkIcon,
    run: (e) => {
      const url = window.prompt("URL");
      if (!url) return;
      e.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    },
  },
  {
    key: "image",
    label: "Image",
    icon: ImageIcon,
    run: (e) => {
      const url = window.prompt("Image URL");
      if (!url) return;
      e.chain().focus().setImage({ src: url }).run();
    },
  },
  { key: "table", label: "Table", icon: TableIcon, run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
];

export function MobileCommandBar({ editor }: Props) {
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [offset, setOffset] = useState(0);
  const [kbOpen, setKbOpen] = useState(false);

  // Track editor focus.
  useEffect(() => {
    if (!editor) return;
    const on = () => {
      setFocused(true);
      setDismissed(false);
    };
    const off = () => setFocused(false);
    editor.on("focus", on);
    editor.on("blur", off);
    return () => {
      editor.off("focus", on);
      editor.off("blur", off);
    };
  }, [editor]);

  // Track visual viewport for keyboard position.
  useEffect(() => {
    if (!isMobile || typeof window === "undefined") return;
    const vv = window.visualViewport;
    const update = () => {
      if (!vv) {
        setKbOpen(false);
        setOffset(0);
        return;
      }
      const kbHeight = window.innerHeight - vv.height - vv.offsetTop;
      // Consider keyboard "open" when at least 120px is occluded.
      const open = kbHeight > 120;
      setKbOpen(open);
      setOffset(open ? kbHeight : 0);
    };
    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isMobile]);

  const insert = useCallback(
    (cmd: Cmd) => {
      if (!editor) return;
      // Keep editor focused so keyboard stays open.
      cmd.run(editor);
    },
    [editor]
  );

  if (!isMobile || !editor) return null;
  if (!focused || !kbOpen || dismissed) return null;

  return (
    <div
      role="toolbar"
      aria-label={t("editor_commands") || "Editor commands"}
      className={cn(
        "fixed left-2 right-2 z-[60] flex items-center gap-1 rounded-2xl border border-white/10",
        "bg-black/90 backdrop-blur-xl shadow-2xl px-2 py-1.5"
      )}
      style={{
        bottom: `calc(${offset}px + env(safe-area-inset-bottom, 0px) + 8px)`,
      }}
      // Prevent iOS/Android from stealing focus from the editor.
      onPointerDown={(e) => e.preventDefault()}
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="flex-1 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 min-w-max">
          {COMMANDS.map((c) => {
            const Icon = c.icon;
            const active = c.active?.(editor) ?? false;
            return (
              <button
                key={c.key}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  insert(c);
                }}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2.5 h-9 text-[12px] transition-colors",
                  active
                    ? "bg-white text-black"
                    : "bg-white/[0.06] text-white/80 hover:bg-white/10"
                )}
                aria-pressed={active}
                aria-label={c.label}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          setDismissed(true);
        }}
        className="ml-1 shrink-0 grid h-9 w-9 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
        aria-label={t("common_close") || "Close"}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
