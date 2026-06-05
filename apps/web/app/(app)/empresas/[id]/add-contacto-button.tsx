"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { CreateContactoModal } from "@/components/create/create-contacto-modal";
import type { CampoPersonalizado } from "@/lib/db/campos";

type Opt = { id: string; nombre: string };

export function AddContactoButton({
  empresas,
  usuarios,
  campos,
  empresaId,
}: {
  empresas: Opt[];
  usuarios: Opt[];
  campos: CampoPersonalizado[];
  empresaId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        <Plus className="h-3.5 w-3.5" /> Agregar contacto
      </button>
      {open && (
        <CreateContactoModal
          empresas={empresas}
          usuarios={usuarios}
          campos={campos}
          onClose={() => setOpen(false)}
          defaultEmpresaId={empresaId}
        />
      )}
    </>
  );
}
