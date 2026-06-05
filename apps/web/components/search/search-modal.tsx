"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Hit = {
  type: "empresa" | "contacto" | "oportunidad";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

const TYPE_LABEL: Record<Hit["type"], string> = {
  empresa: "Empresa",
  contacto: "Contacto",
  oportunidad: "Oportunidad",
};
const TYPE_ICON: Record<Hit["type"], string> = {
  empresa: "🏢",
  contacto: "👤",
  oportunidad: "💼",
};

/**
 * Always-visible search input with a dropdown of results.
 * Cmd+K / Ctrl+K focuses the input from anywhere.
 */
export function SearchModal() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      } else if (e.key === "Escape" && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        if (res.ok) {
          const data = (await res.json()) as { hits: Hit[] };
          setHits(data.hits ?? []);
          setActiveIdx(0);
        }
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const navigate = useCallback(
    (h: Hit) => {
      setOpen(false);
      setQ("");
      setHits([]);
      router.push(h.href);
    },
    [router],
  );

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = hits[activeIdx];
      if (hit) navigate(hit);
    }
  }

  const showDropdown = open && q.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-56">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white focus-within:ring-2 focus-within:ring-brand-primary rounded-md border border-gray-300 transition-colors">
        <span className="text-gray-400 text-sm">🔎</span>
        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
          placeholder="Buscar en el CRM"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 min-w-0"
          aria-label="Buscar"
        />
      </div>

      {showDropdown && (
        <div className="surface-white absolute top-full right-0 left-0 mt-2 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-50 max-h-96 overflow-y-auto min-w-[20rem]">
          {q.trim().length < 2 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">
              Escribí al menos 2 caracteres
            </p>
          ) : loading && hits.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">Buscando...</p>
          ) : hits.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">Sin resultados para «{q}»</p>
          ) : (
            <>
              <ul>
                {hits.map((h, i) => (
                  <li key={`${h.type}-${h.id}`}>
                    <button
                      type="button"
                      onClick={() => navigate(h)}
                      onMouseEnter={() => setActiveIdx(i)}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 ${
                        i === activeIdx ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-lg flex-shrink-0">{TYPE_ICON[h.type]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{h.title}</p>
                        {h.subtitle && (
                          <p className="text-xs text-gray-500 truncate">{h.subtitle}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 uppercase flex-shrink-0">
                        {TYPE_LABEL[h.type]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <footer className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-4">
                <span><kbd className="px-1 bg-gray-100 rounded">↑↓</kbd> navegar</span>
                <span><kbd className="px-1 bg-gray-100 rounded">↵</kbd> abrir</span>
                <span><kbd className="px-1 bg-gray-100 rounded">esc</kbd> cerrar</span>
              </footer>
            </>
          )}
        </div>
      )}
    </div>
  );
}
