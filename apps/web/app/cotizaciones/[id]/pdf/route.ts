import { getCotizacion } from "@/lib/db/cotizaciones";
import { getTenantFromHeaders } from "@/lib/tenant";
import { renderCotizacionPDF } from "@/lib/cotizacion/pdf";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const c = await getCotizacion(id); // tenant-scoped (RLS)
  if (!c) return new Response("Cotización no encontrada", { status: 404 });

  const tenant = await getTenantFromHeaders();
  const fecha = new Date(c.creado_en).toLocaleDateString("es", { year: "numeric", month: "long", day: "numeric" });
  const pdf = await renderCotizacionPDF(c, { agencia: tenant?.nombre_empresa || "Turistea CRM", fecha });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="cotizacion-${id.slice(0, 8)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
