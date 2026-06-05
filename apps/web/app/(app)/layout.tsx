import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getTenantFromHeaders } from "@/lib/tenant";
import { getMyPermisos } from "@/lib/db/roles";
import { getTenantHerramientas, isPlatformAdmin } from "@/lib/db/planes";
import { getNotificaciones } from "@/lib/db/notificaciones";
import { listAgencias } from "@/lib/db/agencias";
import { AppShell } from "@/components/shell/app-shell";
import { ListaEsperaBanner } from "@/components/lista-espera-banner";
import { ImpersonationBanner } from "@/components/impersonation-banner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, tenant] = await Promise.all([
    getSessionUser(),
    getTenantFromHeaders(),
  ]);

  if (!user) redirect("/login");
  if (!user.tenantId || !tenant) redirect("/auth/error?reason=tenant_mismatch");
  if (user.tenantId !== tenant.id) redirect("/auth/error?reason=tenant_mismatch");

  const [{ permisos, es_admin }, herramientas, notificaciones, esPlataforma] = await Promise.all([
    getMyPermisos(),
    getTenantHerramientas(),
    getNotificaciones(),
    isPlatformAdmin(),
  ]);
  const tiene = (k: string) => herramientas === null || herramientas.has(k);
  const tools = {
    roles_permisos: tiene("roles_permisos"),
    importar_datos: tiene("importar_datos"),
  };

  // Agency switcher for "Ver como agencia" (platform admin only).
  const agencias = esPlataforma
    ? (await listAgencias()).map((a) => ({ id: a.id, nombre: a.nombre_empresa }))
    : [];

  return (
    <AppShell
      user={{ id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }}
      tenant={{ nombre_empresa: tenant.nombre_empresa }}
      permisos={permisos}
      esAdmin={es_admin}
      tools={tools}
      notificaciones={notificaciones}
      agencias={agencias}
    >
      <ImpersonationBanner />
      <ListaEsperaBanner />
      {children}
    </AppShell>
  );
}
