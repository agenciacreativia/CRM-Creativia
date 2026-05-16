import Image from "next/image";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-xl text-center space-y-4">
        <Image
          src="/turistea-logo.png"
          alt="Turistea — Mayorista de Turismo"
          width={2000}
          height={497}
          priority
          className="h-20 w-auto mx-auto"
        />
        <p className="text-gray-600 mt-6">
          Acceso por subdominio del cliente. Por favor visitá la URL provista por tu empresa.
        </p>
        <p className="text-sm text-gray-400">
          Tenant access via subdomain. Please visit the URL provided by your organization.
        </p>
      </div>
    </main>
  );
}
