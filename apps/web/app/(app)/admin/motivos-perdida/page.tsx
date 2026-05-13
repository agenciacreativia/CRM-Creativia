import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listMotivosPerdida } from "@/lib/db/motivos";
import { MotivosTable } from "./motivos-table";

export default async function MotivosPerdidaPage() {
  const user = await getSessionUser();
  if (user?.rol !== "admin") redirect("/dashboard");

  const motivos = await listMotivosPerdida();

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold">Motivos de pérdida</h1>
        <p className="text-sm text-gray-500 mt-1">
          Personalizá los motivos que aparecen al marcar una oportunidad como perdida.
        </p>
      </header>
      <MotivosTable initial={motivos} />
    </div>
  );
}
