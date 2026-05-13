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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Row 1: brand · tenant · search · right cluster */}
          <div className="h-14 flex items-center gap-3 sm:gap-4">
            <Link href="/dashboard" className="font-bold text-brand-primary whitespace-nowrap">
              CRM Turistea
            </Link>
            <span className="hidden sm:inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap">
              {tenant.nombre_empresa}
            </span>

            <SearchModal />

            <div className="flex items-center gap-2 sm:gap-3 ml-auto">
              <LanguageSwitcher />
              <span className="text-sm text-gray-600 hidden lg:inline whitespace-nowrap">
                {user.nombre}
                {user.rol && (
                  <span className="ml-1 text-xs uppercase text-gray-400">· {user.rol}</span>
                )}
              </span>
              <SignOutButton />
            </div>
          </div>

          {/* Row 2: nav links, with horizontal scroll on small screens */}
          <div className="border-t border-gray-100 overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-1.5">
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
