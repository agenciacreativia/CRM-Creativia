import { getTenantFromHeaders } from "@/lib/tenant";
import { LoginForm } from "./login-form";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function LoginPage() {
  const tenant = await getTenantFromHeaders();

  return (
    <div className="w-full max-w-md">
      <div className="flex justify-end mb-4">
        <LanguageSwitcher />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-brand-primary">CRM Turistea</h1>
          {tenant && (
            <p className="text-sm text-gray-500 mt-1">{tenant.nombre_empresa}</p>
          )}
        </div>

        <LoginForm />
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        v0.1.0 · Sprint 1
      </p>
    </div>
  );
}
