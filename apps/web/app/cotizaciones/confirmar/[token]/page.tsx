import { confirmarCotizacionPorToken } from "@/lib/db/mutations";

export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

export default async function ConfirmarCotizacionPage({ params }: { params: Params }) {
  const { token } = await params;
  // Magic-link de un solo clic desde el email: confirma (idempotente).
  const res = await confirmarCotizacionPorToken(token);

  const ok = res.ok;
  const titulo = res.titulo;
  const ya = res.yaConfirmada;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fc] p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#e5e7eb] bg-white p-8 text-center shadow-sm">
        {ok ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#eafad1] text-3xl text-[#3f8f00]">✓</div>
            <h1 className="text-xl font-extrabold text-[#272255]">
              {ya ? "Cotización ya confirmada" : "¡Cotización confirmada!"}
            </h1>
            {titulo && <p className="mt-2 text-sm text-[#6b7280]">{titulo}</p>}
            <p className="mt-4 text-sm text-[#6b7280]">
              {ya
                ? "Esta cotización ya había sido confirmada. El equipo se pondrá en contacto para los siguientes pasos."
                : "Gracias. Registramos tu confirmación y el equipo se pondrá en contacto para avanzar con la reserva."}
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#fde8e8] text-3xl text-[#c0392b]">!</div>
            <h1 className="text-xl font-extrabold text-[#272255]">Enlace inválido o vencido</h1>
            <p className="mt-4 text-sm text-[#6b7280]">
              No pudimos encontrar la cotización para este enlace. Puede que el enlace sea incorrecto o que la cotización haya sido eliminada. Contactá a tu asesor.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
