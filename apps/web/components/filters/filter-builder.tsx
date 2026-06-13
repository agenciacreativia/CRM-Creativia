"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, Plus, X, Trash2, Building2, Users, Briefcase, Package, Lock, Globe, Bookmark, Loader2 } from "lucide-react";
import type { ListFilterModule } from "@/lib/filters/server";
import type { ModuloKey } from "@/lib/filters/relations";
import type { Vista, EntidadVista, Visibilidad } from "@/lib/db/vistas";
import { crearVistaAction, eliminarVistaAction } from "@/components/saved-views/actions";
import {
  type FilterCondition,
  type FilterField,
  type FilterOperator,
  type FilterSpec,
  OPERATORS_BY_TYPE,
  OPERATOR_LABELS,
  VALUELESS_OPERATORS,
  decodeFilterSpec,
  encodeFilterSpec,
  specHasConditions,
} from "@/lib/filters/types";

type Props = {
  /** Módulos filtrables desde esta lista (ancla + relacionados). */
  modules: ListFilterModule[];
  paramName?: string;
  /** Si se pasa, habilita guardar/aplicar filtros (vistas guardadas). */
  entidad?: EntidadVista;
  vistas?: Vista[];
};

const MODULE_ICON: Record<string, typeof Building2> = {
  empresa: Building2,
  contacto: Users,
  oportunidad: Briefcase,
  producto: Package,
};

const SELECT_CLS =
  "rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
const INPUT_CLS = SELECT_CLS;

function defaultCondition(modules: ListFilterModule[]): FilterCondition {
  const mod = modules[0];
  const field = mod.fields[0];
  return { module: mod.key, field: field.key, operator: OPERATORS_BY_TYPE[field.type][0], value: "" };
}

export function FilterBuilder({ modules, paramName = "filtros", entidad, vistas = [] }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = decodeFilterSpec(searchParams.get(paramName));
  const activeCount = (current?.and.length ?? 0) + (current?.or.length ?? 0);

  const [open, setOpen] = useState(false);
  const [and, setAnd] = useState<FilterCondition[]>([]);
  const [or, setOr] = useState<FilterCondition[]>([]);

  // Guardar filtro (vistas guardadas)
  const [nombreFiltro, setNombreFiltro] = useState("");
  const [visibilidad, setVisibilidad] = useState<Visibilidad>("privada");
  const [guardarColumnas, setGuardarColumnas] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);
  const [aplicandoId, setAplicandoId] = useState<string | null>(null);
  const tieneColumnas = searchParams.has("cols");

  useEffect(() => {
    if (open) {
      const spec = decodeFilterSpec(searchParams.get(paramName));
      setAnd(spec?.and ?? []);
      setOr(spec?.or ?? []);
      setNombreFiltro("");
      setSaveError(null);
    }
  }, [open, searchParams, paramName]);

  /** Query string que resultaría de aplicar el filtro actual (preserva orden/búsqueda). */
  function buildQuery(): string {
    const spec: FilterSpec = { and, or };
    const params = new URLSearchParams(searchParams.toString());
    if (specHasConditions(spec)) params.set(paramName, encodeFilterSpec(spec));
    else params.delete(paramName);
    return params.toString();
  }

  function apply() {
    router.replace(`${pathname}?${buildQuery()}`);
    setOpen(false);
  }

  function clearAll() {
    setAnd([]);
    setOr([]);
    const params = new URLSearchParams(searchParams.toString());
    params.delete(paramName);
    router.replace(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  async function guardarFiltro() {
    if (!entidad || guardando) return;
    setSaveError(null);
    setGuardando(true);
    // Si NO se guardan columnas, sacamos `cols` del query de la vista para que
    // al aplicarla no toque las columnas visibles del usuario.
    let query = buildQuery();
    if (!guardarColumnas && tieneColumnas) {
      const p = new URLSearchParams(query);
      p.delete("cols");
      query = p.toString();
    }
    const cols = guardarColumnas ? (searchParams.get("cols")?.split(",") ?? null) : null;
    try {
      const res = await crearVistaAction(entidad, nombreFiltro, query, {
        visibilidad,
        columnas: cols,
        aplica_columnas: guardarColumnas,
        revalidate: pathname,
      });
      if (!res.ok) {
        setSaveError(res.error ?? "No se pudo guardar");
        return;
      }
      setNombreFiltro("");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "No se pudo guardar el filtro.");
    } finally {
      setGuardando(false);
    }
  }

  function aplicarVista(v: Vista) {
    if (aplicandoId) return; // evita doble navegación
    setAplicandoId(v.id);
    // No cerramos el modal acá: dejamos el spinner hasta que la navegación
    // recargue la página y desmonte el componente.
    router.push(v.query ? `${pathname}?${v.query}` : pathname);
  }

  async function borrarVista(id: string) {
    if (borrandoId) return; // evita doble clic mientras hay un borrado en curso
    setBorrandoId(id);
    try {
      await eliminarVistaAction(id, pathname);
    } catch {
      setSaveError("No se pudo borrar el filtro.");
    } finally {
      setBorrandoId(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 transition-colors hover:bg-gray-100"
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span className="hidden sm:inline">Filtros avanzados</span>
        {activeCount > 0 && (
          <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-primary px-1.5 text-xs font-semibold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/40 sm:items-start sm:p-8">
          <div className="w-full max-h-[95vh] overflow-y-auto rounded-t-2xl border border-gray-200 bg-white surface-white shadow-2xl sm:max-w-4xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-lg font-bold text-gray-900">Filtros avanzados</h2>
              <button type="button" onClick={() => setOpen(false)} className="icon-btn !h-8 !w-8" aria-label="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-4">
              {/* Filtros guardados — aplicar/borrar */}
              {entidad && vistas.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Filtros guardados</p>
                  <div className="flex flex-wrap gap-2">
                    {vistas.map((v) => (
                      <span
                        key={v.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white py-1 pl-2.5 pr-1.5 text-sm"
                      >
                        <button
                          type="button"
                          onClick={() => aplicarVista(v)}
                          disabled={aplicandoId !== null}
                          className="inline-flex items-center gap-1.5 text-gray-700 hover:text-brand-primary disabled:opacity-60"
                        >
                          {aplicandoId === v.id
                            ? <Loader2 className="h-3 w-3 animate-spin text-brand-primary" />
                            : v.visibilidad === "publica" ? <Globe className="h-3 w-3 text-gray-400" /> : <Lock className="h-3 w-3 text-gray-400" />}
                          {v.nombre}
                        </button>
                        {v.es_propia && (
                          <button
                            type="button"
                            onClick={() => borrarVista(v.id)}
                            disabled={borrandoId !== null}
                            className="rounded p-0.5 text-gray-300 hover:text-status-danger disabled:hover:text-gray-300"
                            aria-label={`Borrar ${v.nombre}`}
                          >
                            {borrandoId === v.id ? <Loader2 className="h-3 w-3 animate-spin text-gray-400" /> : <X className="h-3 w-3" />}
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Group
                kind="and"
                title="Coinciden TODAS estas condiciones"
                modules={modules}
                conditions={and}
                setConditions={setAnd}
              />
              <Group
                kind="or"
                title="Y coincide ALGUNA de estas condiciones"
                modules={modules}
                conditions={or}
                setConditions={setOr}
              />

              {/* Guardar como filtro: nombre + visibilidad */}
              {entidad && specHasConditions({ and, or }) && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="flex-1 text-xs font-medium text-gray-600">
                      Nombre del filtro
                      <input
                        type="text"
                        value={nombreFiltro}
                        onChange={(e) => setNombreFiltro(e.target.value)}
                        placeholder="Ej. Oportunidades de empresas en Bogotá"
                        className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-600">
                      Visibilidad
                      <select
                        value={visibilidad}
                        onChange={(e) => setVisibilidad(e.target.value as Visibilidad)}
                        className="mt-1 block rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm"
                      >
                        <option value="privada">Privado (solo yo)</option>
                        <option value="publica">Público (todo el equipo)</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={guardarFiltro}
                      disabled={!nombreFiltro.trim() || guardando}
                      className="inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-navy-deep disabled:opacity-50"
                    >
                      <Bookmark className="h-3.5 w-3.5" /> {guardando ? "Guardando…" : "Guardar"}
                    </button>
                  </div>
                  {/* Solo ofrecemos guardar columnas si el usuario configuró alguna. */}
                  {tieneColumnas && (
                    <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={guardarColumnas}
                        onChange={(e) => setGuardarColumnas(e.target.checked)}
                        className="rounded"
                      />
                      Guardar también las columnas visibles con este filtro
                    </label>
                  )}
                  {saveError && <p className="mt-2 text-xs text-status-danger">{saveError}</p>}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={clearAll}
                className="text-sm text-gray-500 hover:text-status-danger hover:underline"
              >
                Limpiar todo
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={apply}
                  className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Aplicar filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Group({
  kind,
  title,
  modules,
  conditions,
  setConditions,
}: {
  kind: "and" | "or";
  title: string;
  modules: ListFilterModule[];
  conditions: FilterCondition[];
  setConditions: (c: FilterCondition[]) => void;
}) {
  function add() {
    setConditions([...conditions, defaultCondition(modules)]);
  }
  function update(i: number, patch: Partial<FilterCondition>) {
    setConditions(conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function remove(i: number) {
    setConditions(conditions.filter((_, idx) => idx !== i));
  }

  return (
    <section>
      <h3 className="mb-2 text-sm font-bold text-gray-900">{title}</h3>
      <div className="space-y-2 rounded-lg bg-gray-50 p-3">
        {conditions.length === 0 && (
          <p className="px-1 py-2 text-xs italic text-gray-400">Sin condiciones. Agregá una abajo.</p>
        )}
        {conditions.map((cond, i) => (
          <ConditionRow
            key={i}
            modules={modules}
            cond={cond}
            connector={i === 0 ? "DONDE" : kind === "and" ? "Y" : "O"}
            onUpdate={(patch) => update(i, patch)}
            onRemove={() => remove(i)}
          />
        ))}
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 px-1 pt-1 text-sm font-medium text-brand-primary hover:underline"
        >
          <Plus className="h-4 w-4" />
          Agregar condición
        </button>
      </div>
    </section>
  );
}

function ConditionRow({
  modules,
  cond,
  connector,
  onUpdate,
  onRemove,
}: {
  modules: ListFilterModule[];
  cond: FilterCondition;
  connector: string;
  onUpdate: (patch: Partial<FilterCondition>) => void;
  onRemove: () => void;
}) {
  const moduleKey = (cond.module ?? modules[0].key) as ModuloKey;
  const activeModule = modules.find((m) => m.key === moduleKey) ?? modules[0];
  const fields = activeModule.fields;
  const field = fields.find((f) => f.key === cond.field) ?? fields[0];
  const operators = OPERATORS_BY_TYPE[field.type];
  const needsValue = !VALUELESS_OPERATORS.includes(cond.operator);
  const ModIcon = MODULE_ICON[moduleKey] ?? Package;

  // Cambiar el módulo → resetear campo/operador al primero del nuevo módulo.
  function onModuleChange(key: string) {
    const mod = modules.find((m) => m.key === key) ?? modules[0];
    const f = mod.fields[0];
    onUpdate({ module: mod.key, field: f.key, operator: OPERATORS_BY_TYPE[f.type][0], value: "" });
  }
  function onFieldChange(key: string) {
    const next = fields.find((f) => f.key === key)!;
    const ops = OPERATORS_BY_TYPE[next.type];
    const operator: FilterOperator = ops.includes(cond.operator) ? cond.operator : ops[0];
    onUpdate({ field: key, operator, value: "" });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-white p-2">
      <span className="rounded bg-gray-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
        {connector}
      </span>

      {/* 1) Módulo — solo si hay más de uno para elegir */}
      {modules.length > 1 ? (
        <div className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white pl-2">
          <ModIcon className="h-3.5 w-3.5 text-gray-400" />
          <select
            value={moduleKey}
            onChange={(e) => onModuleChange(e.target.value)}
            className="border-0 bg-transparent py-1.5 pr-1 text-sm focus:outline-none focus:ring-0"
          >
            {modules.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-gray-600">
          <ModIcon className="h-3.5 w-3.5" />
          {activeModule.label}
        </span>
      )}

      {/* 2) Campo */}
      <select value={field.key} onChange={(e) => onFieldChange(e.target.value)} className={SELECT_CLS + " min-w-[8rem]"}>
        {fields.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
            {f.custom ? " ★" : ""}
          </option>
        ))}
      </select>

      {/* 3) Operador */}
      <select
        value={cond.operator}
        onChange={(e) => onUpdate({ operator: e.target.value as FilterOperator })}
        className={SELECT_CLS}
      >
        {operators.map((op) => (
          <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
        ))}
      </select>

      {/* 4) Valor */}
      {needsValue && <ValueInput field={field} value={cond.value} onChange={(v) => onUpdate({ value: v })} />}

      <button
        type="button"
        onClick={onRemove}
        className="ml-auto text-gray-400 hover:text-status-danger"
        aria-label="Quitar condición"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function ValueInput({
  field,
  value,
  onChange,
}: {
  field: FilterField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === "seleccion" && field.options) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT_CLS}>
        <option value="">—</option>
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }
  if (field.type === "booleano") {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT_CLS}>
        <option value="true">Sí</option>
        <option value="false">No</option>
      </select>
    );
  }
  return (
    <input
      type={field.type === "numero" ? "number" : field.type === "fecha" ? "date" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Valor"
      className={INPUT_CLS + " min-w-[8rem]"}
    />
  );
}
