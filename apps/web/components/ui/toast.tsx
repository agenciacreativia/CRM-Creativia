"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from "lucide-react";

type ToastKind = "success" | "error" | "warning" | "info";

type ToastInternal = {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  duration: number;
};

type ToastInput = {
  kind?: ToastKind;
  title: string;
  description?: string;
  duration?: number; // ms; default 4500
};

type ToastApi = {
  push: (t: ToastInput) => string;
  dismiss: (id: string) => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
};

const ToastContext = createContext<ToastApi | null>(null);

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

const KIND_STYLES: Record<ToastKind, { icon: React.ComponentType<{ className?: string }>; bar: string; iconColor: string }> = {
  success: { icon: CheckCircle2, bar: "bg-brand-green", iconColor: "text-brand-green-dark" },
  error: { icon: XCircle, bar: "bg-status-danger", iconColor: "text-status-danger" },
  warning: { icon: AlertTriangle, bar: "bg-brand-orange", iconColor: "text-brand-orange" },
  info: { icon: Info, bar: "bg-brand-navy", iconColor: "text-brand-navy" },
};

let idCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastInternal[]>([]);
  const reduce = useReducedMotion();
  const timeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setItems((arr) => arr.filter((t) => t.id !== id));
    const handle = timeouts.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timeouts.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = `t_${++idCounter}_${Date.now().toString(36)}`;
      const t: ToastInternal = {
        id,
        kind: input.kind ?? "info",
        title: input.title,
        description: input.description,
        duration: input.duration ?? 4500,
      };
      setItems((arr) => [...arr, t]);
      const handle = setTimeout(() => dismiss(id), t.duration);
      timeouts.current.set(id, handle);
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    return () => {
      timeouts.current.forEach((h) => clearTimeout(h));
      timeouts.current.clear();
    };
  }, []);

  const api: ToastApi = useMemo(
    () => ({
      push,
      dismiss,
      success: (title, description) => push({ kind: "success", title, description }),
      error: (title, description) => push({ kind: "error", title, description }),
      warning: (title, description) => push({ kind: "warning", title, description }),
      info: (title, description) => push({ kind: "info", title, description }),
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4 sm:bottom-6 sm:right-6 sm:top-auto sm:items-end sm:justify-end"
      >
        <div className="flex w-full max-w-sm flex-col gap-2">
          <AnimatePresence initial={false}>
            {items.map((t) => {
              const s = KIND_STYLES[t.kind];
              const Icon = s.icon;
              return (
                <motion.div
                  key={t.id}
                  layout={!reduce}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12, x: 0, scale: 0.96 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, x: 0, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24, scale: 0.96, transition: { duration: 0.18 } }}
                  transition={{ duration: 0.28, ease: EASE }}
                  className="pointer-events-auto relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_12px_32px_rgba(31,50,67,0.12)]"
                  role="status"
                >
                  <span className={`absolute inset-y-0 left-0 w-1 ${s.bar}`} aria-hidden />
                  <div className="flex items-start gap-3 py-3 pl-4 pr-3">
                    <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${s.iconColor}`} />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{t.title}</p>
                      {t.description && (
                        <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{t.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => dismiss(t.id)}
                      className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                      aria-label="Cerrar notificación"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // En SSR o tests sin Provider: noop seguro
    return {
      push: () => "",
      dismiss: () => {},
      success: () => "",
      error: () => "",
      warning: () => "",
      info: () => "",
    };
  }
  return ctx;
}
