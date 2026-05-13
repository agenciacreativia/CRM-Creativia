import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { listBackupLog } from "@/lib/db/backup-log";
import { ExportPanel } from "./export-panel";

export default async function ExportarPage() {
  const user = await getSessionUser();
  if (user?.rol !== "admin") redirect("/dashboard");

  const log = await listBackupLog(20);

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/admin/datos" className="text-sm text-brand-primary hover:underline">← Datos</Link>

      <header>
        <h1 className="text-2xl font-bold">Exportar datos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Descargá un backup completo en JSON o exportá una entidad puntual a CSV.
        </p>
      </header>

      <ExportPanel />

      <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <header className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-sm font-bold uppercase text-gray-500">Historial de exportaciones</h2>
        </header>
        {log.length === 0 ? (
          <p className="px-6 py-6 text-sm text-gray-500">Sin exportaciones previas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-2 font-medium">Fecha</th>
                <th className="px-6 py-2 font-medium">Formato</th>
                <th className="px-6 py-2 font-medium">Por</th>
                <th className="px-6 py-2 font-medium">Registros</th>
                <th className="px-6 py-2 font-medium text-right">Tamaño</th>
              </tr>
            </thead>
            <tbody>
              {log.map((b) => (
                <tr key={b.id} className="border-t border-gray-100">
                  <td className="px-6 py-2.5">{new Date(b.realizado_en).toLocaleString("es")}</td>
                  <td className="px-6 py-2.5 uppercase">{b.formato}</td>
                  <td className="px-6 py-2.5 text-gray-600">{b.realizado_por_nombre ?? "—"}</td>
                  <td className="px-6 py-2.5 text-gray-600 text-xs">
                    {Object.entries(b.registros).map(([k, v]) => `${k}:${v}`).join(" · ") || "—"}
                  </td>
                  <td className="px-6 py-2.5 text-right text-gray-600 text-xs">
                    {b.tamano_bytes ? `${(b.tamano_bytes / 1024).toFixed(1)} KB` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
