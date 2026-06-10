"use client";

import { useRef, useState } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Link2, Eraser } from "lucide-react";
import { sanitizeHtml } from "@/lib/security/sanitize-html";

/**
 * Minimal rich-text editor (contentEditable + execCommand). Emits HTML via the
 * hidden input named `name` and the optional `onChange`. Uncontrolled: seed the
 * content with `defaultHtml` and remount (change `key`) to replace it.
 */
export function RichText({
  name,
  defaultHtml = "",
  onChange,
  placeholder = "Escribí el mensaje…",
}: {
  name: string;
  defaultHtml?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(defaultHtml);

  function sync() {
    const h = ref.current?.innerHTML ?? "";
    setHtml(h);
    onChange?.(h);
  }

  function cmd(command: string, value?: string) {
    ref.current?.focus();
    document.execCommand(command, false, value);
    sync();
  }

  function addLink() {
    const url = window.prompt("URL del enlace:", "https://");
    if (url) cmd("createLink", url);
  }

  const isEmpty = html.replace(/<[^>]*>/g, "").trim() === "";

  return (
    <div className="rounded-md border border-gray-300 bg-white">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 p-1">
        <ToolBtn title="Negrita" onClick={() => cmd("bold")}><Bold className="h-4 w-4" /></ToolBtn>
        <ToolBtn title="Cursiva" onClick={() => cmd("italic")}><Italic className="h-4 w-4" /></ToolBtn>
        <ToolBtn title="Subrayado" onClick={() => cmd("underline")}><Underline className="h-4 w-4" /></ToolBtn>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <ToolBtn title="Lista" onClick={() => cmd("insertUnorderedList")}><List className="h-4 w-4" /></ToolBtn>
        <ToolBtn title="Lista numerada" onClick={() => cmd("insertOrderedList")}><ListOrdered className="h-4 w-4" /></ToolBtn>
        <ToolBtn title="Enlace" onClick={addLink}><Link2 className="h-4 w-4" /></ToolBtn>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <ToolBtn title="Quitar formato" onClick={() => cmd("removeFormat")}><Eraser className="h-4 w-4" /></ToolBtn>
      </div>

      <div className="relative">
        {isEmpty && (
          <span className="pointer-events-none absolute left-3 top-3 text-sm text-gray-400">{placeholder}</span>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={sync}
          onBlur={sync}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(defaultHtml) }}
          className="prose-sm min-h-[160px] max-w-none p-3 text-sm leading-relaxed outline-none [&_a]:text-brand-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
        />
      </div>

      <input type="hidden" name={name} value={html} />
    </div>
  );
}

function ToolBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded text-gray-600 hover:bg-gray-100"
    >
      {children}
    </button>
  );
}
