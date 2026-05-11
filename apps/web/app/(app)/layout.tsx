import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getTenantFromHeaders } from "@/lib/tenant";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NavLinks } from "@/components/nav-links";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, tenant] = await Promise.all([
    getSessionUser(),
    getTenantFromHeaders(),
  ]);

  if (!user) redirect("/login");
  if (!user.tenantId || !tenant) redirect("/auth/error?reason=tenant_mismatch");
  if (user.tenantId !== tenant.id) redirect("/auth/error?reason=tenant_mismatch");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-bold text-brand-primary">
              CRM Turistea
            </Link>
            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
              {tenant.nombre_empresa}
            </span>
            <NavLinks rol={user.rol} />
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <span className="text-sm text-gray-600 hidden sm:inline">
              {user.nombre}
              {user.rol && (
                <span className="ml-1 text-xs uppercase text-gray-400">· {user.rol}</span>
              )}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
