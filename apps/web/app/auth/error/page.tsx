import Link from "next/link";

type SearchParams = Promise<{ reason?: string }>;

const REASONS: Record<string, { es: string; en: string }> = {
  tenant_mismatch: {
    es: "Tu cuenta no pertenece a este espacio de trabajo. Volvé a iniciar sesión desde el subdominio correcto.",
    en: "Your account does not belong to this workspace. Please log in from the correct subdomain.",
  },
  invalid_tenant: {
    es: "El subdominio solicitado no existe o está suspendido.",
    en: "The requested subdomain does not exist or is suspended.",
  },
};

export default async function AuthErrorPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const reason = params.reason ?? "unknown";
  const msg = REASONS[reason] ?? { es: "Error de autenticación.", en: "Authentication error." };

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold text-status-danger">Error</h1>
        <p className="text-gray-700">{msg.es}</p>
        <p className="text-gray-500 text-sm">{msg.en}</p>
        <Link href="/login" className="inline-block text-brand-primary hover:underline">
          ← Login
        </Link>
      </div>
    </main>
  );
}
