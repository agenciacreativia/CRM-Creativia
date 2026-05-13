import { notFound } from "next/navigation";
import Link from "next/link";
import { getOportunidad } from "@/lib/db/oportunidades";
import { loadPickerData } from "@/lib/db/picker-data";
import { EditWrapper } from "./edit-wrapper";

type Params = Promise<{ id: string }>;

export default async function EditOportunidadPage({ params }: { params: Params }) {
  const { id } = await params;
  const [oportunidad, picker] = await Promise.all([getOportunidad(id), loadPickerData()]);
  if (!oportunidad) notFound();

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href={`/oportunidades/${id}`} className="text-sm text-brand-primary hover:underline">
        ← {oportunidad.nombre}
      </Link>

      <header>
        <h1 className="text-2xl font-bold">Editar oportunidad</h1>
        <p className="text-sm text-gray-500 mt-1">{oportunidad.nombre}</p>
      </header>

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <EditWrapper
          id={id}
          picker={picker}
          initial={{
            nombre: oportunidad.nombre,
            empresa_id: oportunidad.empresa_id,
            contacto_id: oportunidad.contacto_id,
            pipeline_id: oportunidad.pipeline_id,
            etapa_id: oportunidad.etapa_id,
            asignado_id: oportunidad.asignado_id,
            valor: oportunidad.valor,
            moneda: oportunidad.moneda,
            estado: oportunidad.estado,
            probabilidad_cierre: oportunidad.probabilidad_cierre,
            fecha_esperada_cierre: oportunidad.fecha_esperada_cierre,
            motivo_perdida_id: oportunidad.motivo_perdida_id,
            observaciones_perdida: oportunidad.observaciones_perdida,
            descripcion: oportunidad.descripcion,
          }}
        />
      </section>
    </div>
  );
}
