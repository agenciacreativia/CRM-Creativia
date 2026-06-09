import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listComisiones } from "@/lib/db/comisiones";
import { FilterSelect } from "@/components/list-toolbar";
import { PageHeader } from "@/components/ui/page-header";
import { ComisionesManager } from "./comisiones-manager";

type SearchParams = Promise<{ ym?: string }>;

export default async function ComisionesPage({ searchParams }: { searchParams: SearchParams }) {
  const me = await getSessionUser();
  if (me?.rol !== "admin") redirect("/dashboard");

  const params = await searchParams;
  const now = new Date();
  const defaultYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const ym = params.ym ?? defaultYm;

  const comisiones = await listComisiones(ym);

  // Month options (last 12).
  const meses: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    meses.push({ value: v, label: d.toLocaleDateString("es", { month: "long", year: "numeric" }) });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Comisiones"
        subtitle="Comisión por asesor según ventas ganadas y su % configurado."
        right={<FilterSelect name="ym" options={meses} />}
      />

      <ComisionesManager initial={comisiones} />
    </div>
  );
}
