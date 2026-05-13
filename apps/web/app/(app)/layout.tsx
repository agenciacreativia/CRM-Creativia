import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getTenantFromHeaders } from "@/lib/tenant";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NavLinks } from "@/components/nav-links";
import { SearchModal } from "@/components/search/search-modal";

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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap sm:h-14 sm:py-0">
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            <Link href="/dashboard" className="font-bold text-brand-primary whitespace-nowrap">
              CRM Turistea
            </Link>
            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap">
              {tenant.nombre_empresa}
            </span>
          </div>
          <div className="flex items-center gap-3 order-3 sm:order-2 ml-auto">
            <SearchModal />
            <LanguageSwitcher />
            <span className="text-sm text-gray-600 hidden md:inline whitespace-nowrap">
              {user.nombre}
              {user.rol && (
                <span className="ml-1 text-xs uppercase text-gray-400">· {user.rol}</span>
              )}
            </span>
            <SignOutButton />
          </div>
          <div className="w-full sm:w-auto sm:order-2 -mb-2 sm:mb-0 overflow-hidden">
            <NavLinks rol={user.rol} />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
