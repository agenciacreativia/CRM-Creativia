import { getTenantFromHeaders } from "@/lib/tenant";
import { ForgotPasswordForm } from "./forgot-form";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function ForgotPasswordPage() {
  const tenant = await getTenantFromHeaders();
  return (
    <div className="w-full max-w-md">
      <div className="flex justify-end mb-4">
        <LanguageSwitcher />
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-brand-primary">¿Olvidaste tu contraseña?</h1>
          {tenant && (
            <p className="text-sm text-gray-500 mt-1">{tenant.nombre_empresa}</p>
          )}
          <p className="text-sm text-gray-600 mt-3">
            Ingresá tu email y te enviamos un link para resetearla.
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
