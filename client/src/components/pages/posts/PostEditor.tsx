//src/components/pages/posts/PostEditor.tsx
"use client";
"use no memo";

import React, { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { lowlight, CODE_LANGUAGE_OPTIONS } from "@/lib/markdown/codeLanguages";
import { cn } from "@/lib/utils";
import { normalizeUrlProtocol } from "@/lib/utils/url";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  FileCode,
  Minus,
  Link as LinkIcon,
  Unlink,
  Undo,
  Redo,
  Check,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PostEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}

const escapeHtml = (raw: string): string =>
  raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const convertPastedMarkdownToHtml = (text: string): string | null => {
  const hasMarkdownSyntax =
    /(^|\n)#{1,4}\s+\S|(^|\n)```|(^|\n)\s*[-*+]\s+\S|(^|\n)\s*\d+\.\s+\S|(^|\n)>\s+\S/.test(
      text,
    );
  if (!hasMarkdownSyntax) return null;

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const htmlParts: string[] = [];
  let inCodeBlock = false;
  let codeLang = "";
  let codeLines: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const closeList = () => {
    if (listType) {
      htmlParts.push(`</${listType}>`);
      listType = null;
    }
  };

  const formatInline = (line: string): string => {
    return escapeHtml(line)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  };

  for (const line of lines) {
    const fenceMatch = line.match(/^```([a-zA-Z0-9_+-]*)\s*$/);
    if (fenceMatch) {
      closeList();
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = (fenceMatch[1] || "").trim().toLowerCase();
        codeLines = [];
      } else {
        const langAttr = codeLang ? ` class="language-${codeLang}"` : "";
        htmlParts.push(
          `<pre><code${langAttr}>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
        );
        inCodeBlock = false;
        codeLang = "";
        codeLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      const rawLevel = headingMatch[1]?.length || 2;
      const level = rawLevel <= 2 ? 2 : rawLevel === 3 ? 3 : 4;
      htmlParts.push(
        `<h${level}>${formatInline(headingMatch[2] || "")}</h${level}>`,
      );
      continue;
    }

    const ulMatch = line.match(/^\s*[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (listType !== "ul") {
        closeList();
        listType = "ul";
        htmlParts.push("<ul>");
      }
      htmlParts.push(`<li><p>${formatInline(ulMatch[1] || "")}</p></li>`);
      continue;
    }

    const olMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    if (olMatch) {
      if (listType !== "ol") {
        closeList();
        listType = "ol";
        htmlParts.push("<ol>");
      }
      htmlParts.push(`<li><p>${formatInline(olMatch[1] || "")}</p></li>`);
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      closeList();
      htmlParts.push(
        `<blockquote><p>${formatInline(quoteMatch[1] || "")}</p></blockquote>`,
      );
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      closeList();
      htmlParts.push("<hr>");
      continue;
    }

    if (!line.trim()) {
      closeList();
      continue;
    }

    closeList();
    htmlParts.push(`<p>${formatInline(line)}</p>`);
  }

  closeList();
  if (inCodeBlock) {
    const langAttr = codeLang ? ` class="language-${codeLang}"` : "";
    htmlParts.push(
      `<pre><code${langAttr}>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
    );
  }

  return htmlParts.join("");
};

export default function PostEditor({
  value,
  onChange,
  disabled = false,
  hasError = false,
}: PostEditorProps) {
  const [, setTick] = useState(0);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState("");
  const [linkError, setLinkError] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4],
        },
        codeBlock: false,
        link: false,
        underline: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: null,
      }),
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
        validate: (href) => /^https?:\/\//i.test(href),
      }),
      Placeholder.configure({
        placeholder: "Write your full content here...",
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "post-prose min-h-[300px] max-h-[70vh] overflow-y-auto p-3",
      },
      handlePaste: (_view, event) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        if (editor?.isActive("codeBlock")) return false;

        const html = clipboardData.getData("text/html");
        const text = clipboardData.getData("text/plain");

        if (!html && text) {
          const normalizedText = text.replace(/\r\n/g, "\n");
          const textLines = normalizedText.split("\n");
          const hasFence = /(^|\n)```/.test(normalizedText);
          const codeSignalLines = textLines.filter((line) =>
            /[{};]\s*$|=>|^\s*(const|let|var|function|import|export|def|class|return|print|console)\b/.test(
              line,
            ),
          ).length;
          const looksLikeCode =
            !hasFence &&
            textLines.length >= 3 &&
            codeSignalLines >= Math.ceil(textLines.length * 0.4);

          if (looksLikeCode && editor) {
            event.preventDefault();
            editor.commands.insertContent({
              type: "codeBlock",
              content: [
                { type: "text", text: normalizedText.replace(/\n+$/, "") },
              ],
            });
            return true;
          }

          const converted = convertPastedMarkdownToHtml(text);
          if (converted && editor) {
            event.preventDefault();
            editor.commands.insertContent(converted);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.isEmpty ? "" : currentEditor.getHTML();
      onChange(html);
    },
    onSelectionUpdate: () => {
      setTick((t) => t + 1);
    },
    onTransaction: () => {
      setTick((t) => t + 1);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.isEmpty ? "" : editor.getHTML();
    if (value !== currentHtml) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="border-3 border-double bg-background p-3 min-h-[300px] flex items-center justify-center text-xs font-bold text-primary animate-pulse">
        Loading editor...
      </div>
    );
  }

  const isInCodeBlock = editor.isActive("codeBlock");
  const currentCodeLanguage =
    (editor.getAttributes("codeBlock")?.language as string) || "auto";

  const handleOpenLinkBar = () => {
    const previousUrl = editor.getAttributes("link").href || "";
    setLinkUrlInput(previousUrl);
    setLinkError("");
    setShowLinkInput((prev) => !prev);
  };

  const handleApplyLink = () => {
    const normalized = normalizeUrlProtocol(linkUrlInput);
    if (!normalized) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setShowLinkInput(false);
      setLinkError("");
      return;
    }

    if (!/^https?:\/\/([\w\d\-_]+\.)+\.?[\w\d\-_]+(\/.*)?$/i.test(normalized)) {
      setLinkError("Enter a valid http:// or https:// URL.");
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: normalized })
      .run();
    setShowLinkInput(false);
    setLinkError("");
    setLinkUrlInput("");
  };

  const ToolbarBtn = ({
    onClick,
    active = false,
    disabledBtn = false,
    label,
    shortcut,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    disabledBtn?: boolean;
    label: string;
    shortcut?: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || disabledBtn}
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={cn(
        "h-8 px-2 border-2 border-double rounded-none flex items-center justify-center gap-1 text-xs font-bold transition-colors shrink-0 disabled:opacity-40",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-foreground hover:bg-card hover:text-primary",
      )}
    >
      {children}
    </button>
  );

  return (
    <div
      className={cn(
        "border-3 border-double bg-background flex flex-col",
        hasError && "border-destructive",
        disabled && "opacity-60 pointer-events-none",
      )}
    >
      {/* Toolbar */}
      <div className="border-b-3 border-double bg-card/40 p-2 flex items-center gap-1.5 overflow-x-auto">
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          label="Bold"
          shortcut="Ctrl+B"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          label="Italic"
          shortcut="Ctrl+I"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          label="Strikethrough"
          shortcut="Ctrl+Shift+S"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <ToolbarBtn
          onClick={() => {
            const { from, to } = editor.state.selection;
            const selectedText = editor.state.doc.textBetween(from, to, "\n");
            if (selectedText.includes("\n")) {
              editor
                .chain()
                .focus()
                .deleteSelection()
                .insertContent({
                  type: "codeBlock",
                  content: [{ type: "text", text: selectedText }],
                })
                .run();
              return;
            }
            editor.chain().focus().toggleCode().run();
          }}
          active={editor.isActive("code")}
          label="Inline Code"
          shortcut="Ctrl+E"
        >
          <Code className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <ToolbarBtn
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor.isActive("heading", { level: 2 })}
          label="Heading 2"
          shortcut="Ctrl+Alt+2"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <ToolbarBtn
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          active={editor.isActive("heading", { level: 3 })}
          label="Heading 3"
          shortcut="Ctrl+Alt+3"
        >
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <ToolbarBtn
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 4 }).run()
          }
          active={editor.isActive("heading", { level: 4 })}
          label="Heading 4"
          shortcut="Ctrl+Alt+4"
        >
          <Heading4 className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          label="Bullet List"
          shortcut="Ctrl+Shift+8"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          label="Ordered List"
          shortcut="Ctrl+Shift+7"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          label="Blockquote"
          shortcut="Ctrl+Shift+B"
        >
          <Quote className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={isInCodeBlock}
          label="Code Block"
          shortcut="Ctrl+Alt+C"
        >
          <FileCode className="h-3.5 w-3.5" />
        </ToolbarBtn>

        {isInCodeBlock && (
          <Select
            value={currentCodeLanguage}
            onValueChange={(lang) => {
              editor
                .chain()
                .focus()
                .updateAttributes("codeBlock", {
                  language: lang === "auto" ? null : lang,
                })
                .run();
            }}
          >
            <SelectTrigger
              aria-label="Code block language"
              className="w-32 h-8 border-2 border-double rounded-none bg-background text-xs font-bold focus:ring-0 focus:ring-offset-0 shrink-0"
            >
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent className="border-3 border-double rounded-none bg-background text-xs font-bold max-h-60">
              <SelectItem
                value="auto"
                className="focus:bg-primary focus:text-primary-foreground rounded-none"
              >
                auto
              </SelectItem>
              {CODE_LANGUAGE_OPTIONS.map((lang) => (
                <SelectItem
                  key={lang}
                  value={lang}
                  className="focus:bg-primary focus:text-primary-foreground rounded-none"
                >
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <ToolbarBtn
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          label="Horizontal Rule"
        >
          <Minus className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <ToolbarBtn
          onClick={handleOpenLinkBar}
          active={editor.isActive("link") || showLinkInput}
          label="Insert or Edit Link"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolbarBtn>

        {editor.isActive("link") && (
          <ToolbarBtn
            onClick={() =>
              editor.chain().focus().extendMarkRange("link").unsetLink().run()
            }
            label="Remove Link"
          >
            <Unlink className="h-3.5 w-3.5" />
          </ToolbarBtn>
        )}

        <ToolbarBtn
          onClick={() => editor.chain().focus().undo().run()}
          disabledBtn={!editor.can().chain().focus().undo().run()}
          label="Undo"
          shortcut="Ctrl+Z"
        >
          <Undo className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <ToolbarBtn
          onClick={() => editor.chain().focus().redo().run()}
          disabledBtn={!editor.can().chain().focus().redo().run()}
          label="Redo"
          shortcut="Ctrl+Shift+Z"
        >
          <Redo className="h-3.5 w-3.5" />
        </ToolbarBtn>
      </div>

      {/* Inline Link Input Row */}
      {showLinkInput && (
        <div className="border-b-3 border-double bg-card/20 p-2 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={linkUrlInput}
              onChange={(e) => setLinkUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApplyLink();
                }
              }}
              placeholder="https://example.com"
              className="flex-1 bg-background border-2 border-double px-2 py-1 text-xs font-bold outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={handleApplyLink}
              aria-label="Apply Link"
              className="h-7 px-2 border-2 border-double bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1"
            >
              <Check className="h-3 w-3" />
              <span>Apply</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLinkInput(false);
                setLinkError("");
              }}
              aria-label="Cancel Link"
              className="h-7 px-2 border-2 border-double bg-background text-xs font-bold flex items-center gap-1"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          {linkError && (
            <p className="text-xs text-destructive font-bold">{linkError}</p>
          )}
        </div>
      )}

      {/* Editor Content Surface */}
      <EditorContent editor={editor} />
    </div>
  );
}
