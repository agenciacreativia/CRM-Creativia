import { getTenantFromHeaders } from "@/lib/tenant";
import { ResetPasswordForm } from "./reset-form";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function ResetPasswordPage() {
  const tenant = await getTenantFromHeaders();
  return (
    <div className="w-full max-w-md">
      <div className="flex justify-end mb-4">
        <LanguageSwitcher />
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-brand-primary">Nueva contraseña</h1>
          {tenant && (
            <p className="text-sm text-gray-500 mt-1">{tenant.nombre_empresa}</p>
          )}
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
