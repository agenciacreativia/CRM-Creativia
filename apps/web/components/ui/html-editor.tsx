"use client";

import { useRef, useState } from "react";
import { Bold, Italic, Link as LinkIcon, List, ListOrdered, Heading2, Eye, Code as CodeIcon } from "lucide-react";
import { sanitizeHtml } from "@/lib/security/sanitize-html";

/**
 * Editor HTML liviano (contenteditable + execCommand). No requiere dependencias
 * y cubre lo que pide una agencia para correos: títulos, negrita, listas, links,
 * vista previa y opción de editar el HTML crudo.
 *
 * Nota: usa document.execCommand que está marcado como deprecated pero sigue
 * funcionando en todos los browsers actuales para uso interno.
 */
export function HtmlEditor({
  value,
  onChange,
  placeholder,
  rows = 10,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"editor" | "html" | "preview">("editor");

  function exec(cmd: string, arg?: string) {
    document.execCommand(cmd, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  }
  function addLink() {
    const url = prompt("URL del enlace:", "https://");
    if (!url) return;
    exec("createLink", url);
  }

  return (
    <div className="overflow-hidden rounded-md border border-gray-300">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 p-1">
        <TabBtn active={mode === "editor"} onClick={() => setMode("editor")}>Editor</TabBtn>
        <TabBtn active={mode === "preview"} onClick={() => setMode("preview")}><Eye className="mr-1 inline h-3.5 w-3.5" /> Vista previa</TabBtn>
        <TabBtn active={mode === "html"} onClick={() => setMode("html")}><CodeIcon className="mr-1 inline h-3.5 w-3.5" /> HTML</TabBtn>
        {mode === "editor" && (
          <>
            <span className="mx-1 h-4 w-px bg-gray-300" />
            <Btn title="Negrita" onClick={() => exec("bold")}><Bold className="h-3.5 w-3.5" /></Btn>
            <Btn title="Cursiva" onClick={() => exec("italic")}><Italic className="h-3.5 w-3.5" /></Btn>
            <Btn title="Título" onClick={() => exec("formatBlock", "<h2>")}><Heading2 className="h-3.5 w-3.5" /></Btn>
            <Btn title="Lista" onClick={() => exec("insertUnorderedList")}><List className="h-3.5 w-3.5" /></Btn>
            <Btn title="Lista numerada" onClick={() => exec("insertOrderedList")}><ListOrdered className="h-3.5 w-3.5" /></Btn>
            <Btn title="Enlace" onClick={addLink}><LinkIcon className="h-3.5 w-3.5" /></Btn>
            <span className="mx-1 h-4 w-px bg-gray-300" />
            <select
              title="Variables"
              onChange={(e) => {
                if (e.target.value) {
                  exec("insertText", e.target.value);
                  e.target.value = "";
                }
              }}
              className="rounded border border-gray-300 bg-white px-1 py-0.5 text-xs"
              defaultValue=""
            >
              <option value="" disabled>+ Variable</option>
              <option value="{{nombre}}">{"{{nombre}}"}</option>
              <option value="{{empresa}}">{"{{empresa}}"}</option>
              <option value="{{email}}">{"{{email}}"}</option>
            </select>
          </>
        )}
      </div>

      {mode === "editor" && (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
          onBlur={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
          className="prose prose-sm max-w-none p-3 text-sm focus:outline-none"
          style={{ minHeight: `${rows * 22}px` }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
          data-placeholder={placeholder}
        />
      )}
      {mode === "html" && (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border-0 p-3 font-mono text-xs focus:outline-none"
          placeholder={placeholder}
        />
      )}
      {mode === "preview" && (
        <div className="prose prose-sm max-w-none border-0 p-4 text-sm" style={{ minHeight: `${rows * 22}px` }} dangerouslySetInnerHTML={{ __html: value ? sanitizeHtml(value) : "<p class='text-gray-400'>Sin contenido</p>" }} />
      )}
    </div>
  );
}

function Btn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button type="button" title={title} onMouseDown={(e) => e.preventDefault()} onClick={onClick} className="rounded p-1 text-gray-700 hover:bg-white">
      {children}
    </button>
  );
}
function TabBtn({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded px-2 py-1 text-xs font-medium ${active ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:bg-white"}`}>
      {children}
    </button>
  );
}
