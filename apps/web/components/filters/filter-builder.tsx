"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, Plus, X, Trash2 } from "lucide-react";
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
  fields: FilterField[];
  paramName?: string;
};

const SELECT_CLS =
  "rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";
const INPUT_CLS =
  "rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary";

function defaultCondition(fields: FilterField[]): FilterCondition {
  const field = fields[0];
  const op = OPERATORS_BY_TYPE[field.type][0];
  return { field: field.key, operator: op, value: "" };
}

export function FilterBuilder({ fields, paramName = "filtros" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = decodeFilterSpec(searchParams.get(paramName));
  const activeCount = (current?.and.length ?? 0) + (current?.or.length ?? 0);

  const [open, setOpen] = useState(false);
  const [and, setAnd] = useState<FilterCondition[]>([]);
  const [or, setOr] = useState<FilterCondition[]>([]);

  // Sincroniza el estado local desde la URL al abrir el diálogo,
  // o si los parámetros cambian mientras el diálogo está abierto.
  useEffect(() => {
    if (open) {
      const spec = decodeFilterSpec(searchParams.get(paramName));
      setAnd(spec?.and ?? []);
      setOr(spec?.or ?? []);
    }
  }, [open, searchParams, paramName]);

  function apply() {
    const spec: FilterSpec = { and, or };
    const params = new URLSearchParams(searchParams.toString());
    if (specHasConditions(spec)) params.set(paramName, encodeFilterSpec(spec));
    else params.delete(paramName);
    router.replace(`${pathname}?${params.toString()}`);
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filtros avanzados
        {activeCount > 0 && (
          <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-primary px-1.5 text-xs font-semibold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
          <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white surface-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-lg font-bold text-gray-900">Filtros avanzados</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="icon-btn !h-8 !w-8"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60vh] space-y-5 overflow-y-auto px-5 py-4">
              <Group
                title="Y — todas las condiciones se cumplen"
                hint="El registro debe cumplir TODAS estas condiciones."
                accent="navy"
                fields={fields}
                conditions={and}
                setConditions={setAnd}
              />
              <Group
                title="O — alguna condición se cumple"
                hint="El registro se incluye si cumple AL MENOS UNA de estas condiciones."
                accent="green"
                fields={fields}
                conditions={or}
                setConditions={setOr}
              />
            </div>

            {/* Footer */}
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

/* ------------------------------------------------------------------ */
/*  Condition group (Y or O)                                           */
/* ------------------------------------------------------------------ */

function Group({
  title,
  hint,
  accent,
  fields,
  conditions,
  setConditions,
}: {
  title: string;
  hint: string;
  accent: "navy" | "green";
  fields: FilterField[];
  conditions: FilterCondition[];
  setConditions: (c: FilterCondition[]) => void;
}) {
  function add() {
    setConditions([...conditions, defaultCondition(fields)]);
  }
  function update(i: number, patch: Partial<FilterCondition>) {
    setConditions(conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function remove(i: number) {
    setConditions(conditions.filter((_, idx) => idx !== i));
  }

  return (
    <section
      className={
        "surface-white rounded-xl border p-4 " +
        (accent === "navy" ? "border-[rgba(39,34,85,0.25)]" : "border-[rgba(149,222,0,0.55)]")
      }
    >
      <header className="mb-3">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500">{hint}</p>
      </header>

      <div className="space-y-2">
        {conditions.length === 0 && (
          <p className="text-xs italic text-gray-400">Sin condiciones todavía.</p>
        )}
        {conditions.map((cond, i) => (
          <ConditionRow
            key={i}
            fields={fields}
            cond={cond}
            isFirst={i === 0}
            connector={accent === "navy" ? "Y" : "O"}
            onUpdate={(patch) => update(i, patch)}
            onRemove={() => remove(i)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary hover:underline"
      >
        <Plus className="h-4 w-4" />
        Añadir condición
      </button>
    </section>
  );
}

function ConditionRow({
  fields,
  cond,
  isFirst,
  connector,
  onUpdate,
  onRemove,
}: {
  fields: FilterField[];
  cond: FilterCondition;
  isFirst: boolean;
  connector: string;
  onUpdate: (patch: Partial<FilterCondition>) => void;
  onRemove: () => void;
}) {
  const field = fields.find((f) => f.key === cond.field) ?? fields[0];
  const operators = OPERATORS_BY_TYPE[field.type];
  const needsValue = !VALUELESS_OPERATORS.includes(cond.operator);

  function onFieldChange(key: string) {
    const next = fields.find((f) => f.key === key)!;
    const ops = OPERATORS_BY_TYPE[next.type];
    const operator: FilterOperator = ops.includes(cond.operator) ? cond.operator : ops[0];
    onUpdate({ field: key, operator, value: "" });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-6 text-xs font-semibold text-gray-400">{isFirst ? "" : connector}</span>

      <select
        value={cond.field}
        onChange={(e) => onFieldChange(e.target.value)}
        className={SELECT_CLS + " min-w-[9rem]"}
      >
        {fields.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
            {f.custom ? " ★" : ""}
          </option>
        ))}
      </select>

      <select
        value={cond.operator}
        onChange={(e) => onUpdate({ operator: e.target.value as FilterOperator })}
        className={SELECT_CLS}
      >
        {operators.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABELS[op]}
          </option>
        ))}
      </select>

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
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
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
