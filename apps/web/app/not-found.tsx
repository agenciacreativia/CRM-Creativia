import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">404</h1>
        <p className="text-gray-600">Página no encontrada / Page not found</p>
        <Link href="/" className="text-brand-primary hover:underline">
          ← Volver
        </Link>
      </div>
    </main>
  );
}
