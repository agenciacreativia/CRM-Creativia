"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

type Props = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** max width tailwind class, e.g. "max-w-2xl" */
  size?: string;
};

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

export function Modal({ title, onClose, children, size = "max-w-2xl" }: Props) {
  const reduce = useReducedMotion();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Bloquea scroll del body mientras el modal está abierto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        key="modal"
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          backdropFilter: reduce ? "none" : "blur(8px)",
          backgroundColor: "rgba(0,0,0,0.45)",
          transition: { duration: reduce ? 0 : 0.18, ease: EASE },
        }}
        exit={{
          opacity: 0,
          backdropFilter: "blur(0px)",
          backgroundColor: "rgba(0,0,0,0)",
          transition: { duration: reduce ? 0 : 0.15, ease: EASE },
        }}
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className={`surface-white w-full ${size} rounded-2xl border border-gray-200 bg-white shadow-2xl`}
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            transition: reduce
              ? { duration: 0 }
              : { duration: 0.28, ease: EASE, delay: 0.05 },
          }}
          exit={{
            opacity: 0,
            scale: 0.97,
            y: 4,
            transition: { duration: reduce ? 0 : 0.15, ease: EASE },
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 id="modal-title" className="text-lg font-bold text-gray-900">{title}</h2>
            <button type="button" onClick={onClose} className="icon-btn !h-8 !w-8" aria-label="Cerrar">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[75vh] overflow-y-auto px-5 py-5">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
