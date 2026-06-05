import { getEnvioNpsByToken } from "@/lib/db/nps";
import { NpsForm } from "./nps-form";

type Params = Promise<{ token: string }>;

export default async function NpsPublicPage({ params }: { params: Params }) {
  const { token } = await params;
  const env = await getEnvioNpsByToken(token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        {!env ? (
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">Encuesta no encontrada</h1>
            <p className="mt-2 text-sm text-gray-500">El enlace es incorrecto o ya no está disponible.</p>
          </div>
        ) : env.estado === "respondida" ? (
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">¡Gracias!</h1>
            <p className="mt-2 text-sm text-gray-500">Ya recibimos tu opinión.</p>
          </div>
        ) : (
          <>
            <header className="mb-5 text-center">
              <h1 className="text-xl font-bold text-gray-900">¿Cómo fue tu viaje?</h1>
              {env.oportunidad_nombre && <p className="mt-1 text-sm text-gray-500">{env.oportunidad_nombre}</p>}
            </header>
            <NpsForm token={token} contacto={env.contacto_nombre} />
          </>
        )}
      </div>
    </div>
  );
}
