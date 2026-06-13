import Image from "next/image";
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
          <Image
            src="/turistea-crm.svg"
            alt="Turistea CRM — Mayorista de Turismo"
            width={1677}
            height={451}
            priority
            className="h-12 w-auto mx-auto"
          />
          {tenant && (
            <p className="text-sm text-gray-500 mt-3">{tenant.nombre_empresa}</p>
          )}
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
