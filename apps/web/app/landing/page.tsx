export default function LandingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-xl text-center space-y-4">
        <h1 className="text-4xl font-bold text-brand-primary">CRM Turistea</h1>
        <p className="text-gray-600">
          Acceso por subdominio del cliente. Por favor visitá la URL provista por tu empresa.
        </p>
        <p className="text-sm text-gray-400">
          Tenant access via subdomain. Please visit the URL provided by your organization.
        </p>
      </div>
    </main>
  );
}
