import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function AdminUsuariosPage() {
  const user = await getSessionUser();
  if (user?.rol !== "admin") redirect("/dashboard");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Gestión de Usuarios</h1>
      <p className="text-sm text-gray-500">Implementación en Sprint 6.</p>
    </div>
  );
}
