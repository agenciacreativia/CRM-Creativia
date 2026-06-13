"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Check, MapPin, Plane, Search, ChevronDown, ChevronUp, Filter, X, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ProductoMayorista, SalidaCatalogo } from "@/lib/db/catalogo-mayorista";
import { copiarProductoAction, copiarMultiplesProductosAction } from "./actions";

function money(v: number | null, m: string | null) {
  return v == null ? "—" : new Intl.NumberFormat("es", { style: "currency", currency: m || "USD", maximumFractionDigits: 0 }).format(v);
}
function ym(iso: string) {
  return iso.slice(0, 7); // YYYY-MM
}
function fmtMonth(iso: string) {
  return new Date(iso + "-01T00:00:00").toLocaleDateString("es", { month: "long", year: "numeric" });
}

export function CatalogoBrowse({ productos, puedeCopiar }: { productos: ProductoMayorista[]; puedeCopiar: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [aerolinea, setAerolinea] = useState("");
  const [mes, setMes] = useState("");
  const [precioMax, setPrecioMax] = useState("");
  const [soloConCupos, setSoloConCupos] = useState(false);
  const [markup, setMarkup] = useState(20);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);

  // Reset de "done"/"selected" cuando cambian los productos (recarga, navegación).
  // Sin esto el Set se quedaba con IDs viejos y se marcaban como copiados productos nuevos.
  useEffect(() => {
    setDone(new Set());
    setSelected(new Set());
  }, [productos]);

  // Catálogos para los selects (derivados).
  const origenes = useMemo(() => [...new Set(productos.map((p) => p.origen).filter((s): s is string => !!s))].sort(), [productos]);
  const destinos = useMemo(() => [...new Set(productos.flatMap((p) => p.paises ?? []).filter(Boolean))].sort(), [productos]);
  const aerolineas = useMemo(() => [...new Set(productos.flatMap((p) => p.aerolineas ?? []))].sort(), [productos]);
  const meses = useMemo(() => {
    const s = new Set<string>();
    productos.forEach((p) => (p.salidas ?? []).forEach((sa) => s.add(ym(sa.fecha_salida))));
    return [...s].sort();
  }, [productos]);

  // Filtros aplicados en memoria (búsqueda en vivo).
  const filtrados = useMemo(() => {
    const qn = q.trim().toLowerCase();
    const precioMaxN = precioMax ? Number(precioMax) : Infinity;
    return productos
      .map((p) => {
        // Salidas que pasan los filtros de fecha/aerolínea/cupos.
        const salidasFiltradas = (p.salidas ?? []).filter((s) => {
          if (mes && ym(s.fecha_salida) !== mes) return false;
          if (aerolinea && s.aerolinea !== aerolinea) return false;
          if (soloConCupos && s.cupos <= 0) return false;
          return true;
        });
        return { p, salidasFiltradas };
      })
      .filter(({ p, salidasFiltradas }) => {
        if (qn && !`${p.nombre} ${p.destino ?? ""}`.toLowerCase().includes(qn)) return false;
        if (origen && p.origen !== origen) return false;
        if (destino && !(p.paises ?? []).includes(destino)) return false;
        if (aerolinea && !(p.aerolineas ?? []).includes(aerolinea)) return false;
        // Si hay filtros de fecha/aerolínea/cupos, exigir al menos una salida que pase.
        if ((mes || aerolinea || soloConCupos) && salidasFiltradas.length === 0) return false;
        // Precio "desde" (entre las salidas filtradas si hay; si no, todas).
        const pool = (mes || aerolinea || soloConCupos ? salidasFiltradas : p.salidas) ?? [];
        const precios = pool.map((s) => s.precio_dbl).filter((x): x is number => x != null && x > 0);
        const desde = precios.length ? Math.min(...precios) : p.precio_neto ?? null;
        if (desde != null && desde > precioMaxN) return false;
        return true;
      });
  }, [productos, q, origen, destino, aerolinea, mes, precioMax, soloConCupos]);

  const limpiarFiltros = () => {
    setQ(""); setOrigen(""); setDestino(""); setAerolinea(""); setMes(""); setPrecioMax(""); setSoloConCupos(false);
  };
  const filtrosActivos =
    !!q || !!origen || !!destino || !!aerolinea || !!mes || !!precioMax || soloConCupos;

  async function copiar(p: ProductoMayorista) {
    setError(null);
    setBusy(p.id);
    const res = await copiarProductoAction(
      {
        nombre: p.nombre, categoria: p.categoria, destino: p.destino, duracion: p.duracion,
        proveedor: p.proveedor, descripcion: p.descripcion, incluye: p.incluye, no_incluye: p.no_incluye,
        precio_neto: p.precio_neto, moneda: p.moneda,
      },
      markup,
    );
    setBusy(null);
    if (!res.ok) setError(res.error ?? "Error");
    else { setDone((s) => new Set(s).add(p.id)); router.refresh(); }
  }

  const visibleIds = useMemo(() => filtrados.map((f) => f.p.id), [filtrados]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  function toggleSelect(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  function toggleAllVisible() {
    setSelected((s) => {
      const n = new Set(s);
      if (allVisibleSelected) visibleIds.forEach((id) => n.delete(id));
      else visibleIds.forEach((id) => n.add(id));
      return n;
    });
  }
  async function copiarSeleccionados() {
    setError(null); setBulkMsg(null); setBulkBusy(true);
    const items = productos
      .filter((p) => selected.has(p.id))
      .map((p) => ({
        nombre: p.nombre, categoria: p.categoria, destino: p.destino, duracion: p.duracion,
        proveedor: p.proveedor, descripcion: p.descripcion, incluye: p.incluye, no_incluye: p.no_incluye,
        precio_neto: p.precio_neto, moneda: p.moneda,
      }));
    const res = await copiarMultiplesProductosAction(items, markup);
    setBulkBusy(false);
    if (!res.ok) setError(res.error ?? "Error");
    else {
      setDone((s) => { const n = new Set(s); selected.forEach((id) => n.add(id)); return n; });
      const count = res.count ?? selected.size;
      setBulkMsg(`${count} producto${count === 1 ? "" : "s"} copiado${count === 1 ? "" : "s"} a tu catálogo`);
      setSelected(new Set());
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

      {/* Toolbar: búsqueda + toggle filtros + markup */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar plan o destino…" className="pl-8" />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm ${filtrosActivos ? "border-brand-primary bg-blue-50 text-brand-primary" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
        >
          <Filter className="h-4 w-4" /> Filtros {filtrosActivos && <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-primary px-1 text-[11px] font-bold text-white">!</span>}
        </button>
        {filtrosActivos && (
          <button onClick={limpiarFiltros} className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}
        {puedeCopiar && (
          <div className="ml-auto flex items-center gap-1.5 text-sm">
            <span className="text-gray-500">Markup:</span>
            <Input type="number" min="0" value={markup} onChange={(e) => setMarkup(Number(e.target.value))} className="w-16 text-right" />
            <span className="text-gray-500">%</span>
          </div>
        )}
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 md:grid-cols-6">
          <FilterCell label="Origen">
            <Select value={origen} onChange={(e) => setOrigen(e.target.value)}>
              <option value="">Todos</option>
              {origenes.map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
          </FilterCell>
          <FilterCell label="Destino (país)">
            <Select value={destino} onChange={(e) => setDestino(e.target.value)}>
              <option value="">Todos</option>
              {destinos.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </FilterCell>
          <FilterCell label="Aerolínea">
            <Select value={aerolinea} onChange={(e) => setAerolinea(e.target.value)}>
              <option value="">Todas</option>
              {aerolineas.map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </FilterCell>
          <FilterCell label="Mes de salida">
            <Select value={mes} onChange={(e) => setMes(e.target.value)}>
              <option value="">Cualquiera</option>
              {meses.map((m) => <option key={m} value={m} className="capitalize">{fmtMonth(m)}</option>)}
            </Select>
          </FilterCell>
          <FilterCell label="Precio máx (USD)">
            <Input type="number" min="0" value={precioMax} onChange={(e) => setPrecioMax(e.target.value)} placeholder="—" />
          </FilterCell>
          <FilterCell label="Disponibilidad">
            <label className="flex h-9 items-center gap-1.5 text-sm text-gray-700">
              <input type="checkbox" checked={soloConCupos} onChange={(e) => setSoloConCupos(e.target.checked)} className="h-4 w-4" />
              Solo con cupos
            </label>
          </FilterCell>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-gray-500">{filtrados.length} de {productos.length} planes</p>
        {puedeCopiar && filtrados.length > 0 && (
          <label className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} className="h-3.5 w-3.5" />
            Seleccionar todos los visibles ({filtrados.length})
          </label>
        )}
        {puedeCopiar && selected.size > 0 && (
          <button
            onClick={copiarSeleccionados}
            disabled={bulkBusy}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-2.5 py-1 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" /> {bulkBusy ? "Copiando…" : `Cargar ${selected.size} a mis productos`}
          </button>
        )}
      </div>
      {bulkMsg && <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">{bulkMsg}</div>}

      {/* Tarjetas */}
      {filtrados.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">No hay planes con esos filtros.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtrados.map(({ p, salidasFiltradas }) => {
            const salidas = (mes || aerolinea || soloConCupos) ? salidasFiltradas : (p.salidas ?? []);
            const precios = salidas.map((s) => s.precio_dbl).filter((x): x is number => x != null && x > 0);
            const desde = precios.length ? Math.min(...precios) : p.precio_neto;
            const venta = desde != null ? Math.round(desde * (1 + markup / 100)) : null;
            const isOpen = expanded[p.id];
            const cuposTotal = salidas.reduce((s, x) => s + (x.cupos ?? 0), 0);
            const lowStock = cuposTotal > 0 && cuposTotal < 10;
            return (
              <div key={p.id} className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:-translate-y-[2px] hover:border-gray-300 hover:shadow-lift">
                {/* Header con imagen o gradient + badges */}
                <div className="relative h-32 overflow-hidden bg-gradient-to-br from-brand-navy via-brand-navy-deep to-[#0a0628]">
                  {p.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imagen_url} alt={p.nombre} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="absolute inset-0 opacity-20" style={{
                      backgroundImage: "radial-gradient(circle at 20% 30%, rgba(170,245,43,0.3), transparent 50%), radial-gradient(circle at 80% 70%, rgba(133,194,246,0.2), transparent 50%)",
                    }} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  {puedeCopiar && (
                    <label className="absolute right-3 top-3 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-white/95 shadow ring-1 ring-black/10 hover:bg-white">
                      <input type="checkbox" aria-label={`Seleccionar ${p.nombre}`} checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} className="h-3.5 w-3.5" onClick={(e) => e.stopPropagation()} />
                    </label>
                  )}
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    {p.categoria && (
                      <span className="rounded-md bg-brand-green px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-navy-deep">
                        {p.categoria}
                      </span>
                    )}
                    {lowStock && (
                      <span className="rounded-md bg-brand-orange px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                        Low Stock
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="line-clamp-2 text-sm font-bold leading-tight text-white">{p.nombre}</h3>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <div className="space-y-1 text-xs text-gray-500">
                    {p.destino && <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3 shrink-0" /> {p.destino}{p.duracion ? ` · ${p.duracion}` : ""}</p>}
                    {p.aerolineas && p.aerolineas.length > 0 && <p className="flex items-center gap-1.5"><Plane className="h-3 w-3 shrink-0" /> {p.aerolineas.join(", ")}</p>}
                    <p className="flex items-center gap-1.5"><Calendar className="h-3 w-3 shrink-0" /> {salidas.length} salida{salidas.length === 1 ? "" : "s"}</p>
                  </div>

                  <div className="mt-4 flex items-end justify-between border-t border-gray-100 pt-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Neto desde</p>
                      <p className="text-lg font-bold tracking-tight text-gray-900">{money(desde, p.moneda)}</p>
                    </div>
                    {puedeCopiar && venta != null && (
                      <div className="text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Tu venta</p>
                        <p className="text-base font-bold text-brand-navy">{money(venta, p.moneda)}</p>
                      </div>
                    )}
                  </div>

                  {/* Salidas plegables */}
                  {salidas.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setExpanded((m) => ({ ...m, [p.id]: !m[p.id] }))}
                        className="mt-3 inline-flex items-center gap-1 self-start text-xs font-semibold text-brand-navy hover:underline"
                      >
                        {isOpen ? <><ChevronUp className="h-3.5 w-3.5" /> Ocultar salidas</> : <><ChevronDown className="h-3.5 w-3.5" /> Ver salidas</>}
                      </button>
                      {isOpen && <SalidasList salidas={salidas} moneda={p.moneda} />}
                    </>
                  )}

                  {puedeCopiar && (
                    <button
                      onClick={() => copiar(p)}
                      disabled={busy === p.id || done.has(p.id)}
                      className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-md bg-brand-green px-3 py-2 text-sm font-semibold text-brand-navy-deep transition hover:brightness-105 disabled:opacity-60"
                    >
                      {done.has(p.id) ? <><Check className="h-4 w-4" /> Cargado</> : <><Download className="h-4 w-4" /> {busy === p.id ? "Cargando…" : "Cargar a mis productos"}</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase text-gray-500">{label}</label>
      {children}
    </div>
  );
}

function SalidasList({ salidas, moneda }: { salidas: SalidaCatalogo[]; moneda: string }) {
  return (
    <div className="mt-2 max-h-56 overflow-y-auto rounded border border-gray-100 bg-gray-50">
      <table className="w-full text-xs">
        <thead className="bg-gray-100 text-[11px] uppercase text-gray-500">
          <tr>
            <th className="px-2 py-1 text-left">Salida</th>
            <th className="px-2 py-1 text-left">Aero.</th>
            <th className="px-2 py-1 text-right">Doble</th>
            <th className="px-2 py-1 text-right">Cupos</th>
          </tr>
        </thead>
        <tbody>
          {salidas.map((s, i) => (
            <tr key={i} className="border-t border-gray-100">
              <td className="px-2 py-1 text-gray-800">{s.fecha_salida}</td>
              <td className="px-2 py-1 text-gray-600">{s.aerolinea ?? "—"}</td>
              <td className="px-2 py-1 text-right text-gray-800">{money(s.precio_dbl, moneda)}</td>
              <td className={`px-2 py-1 text-right ${s.cupos === 0 ? "text-status-danger" : s.cupos < 5 ? "text-amber-600" : "text-gray-700"}`}>
                {s.cupos}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
