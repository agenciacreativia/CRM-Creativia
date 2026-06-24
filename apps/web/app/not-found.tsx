import Link from "next/link";
import { ArrowLeft, Compass, Mail } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f9ff] px-5 py-16 text-[#081d2d]">
      <div className="mx-auto w-full max-w-xl text-center">
        <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#272255] text-[#aaf52b] shadow-[0_8px_24px_rgba(31,50,67,0.15)]">
          <Compass className="h-8 w-8" />
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ea6a30]">
          Error 404
        </p>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight text-[#120b40] sm:text-5xl">
          Esta ruta no existe<br className="hidden sm:block" />
          en el mapa
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base text-[#47464f]">
          Tal vez la URL está mal escrita, el contenido se movió o nunca existió.
          No te preocupes — volvamos a tierra firme.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-[#aaf52b] px-6 py-3 text-sm font-bold text-[#120b40] shadow-[0_4px_12px_rgba(170,245,43,0.4)] transition hover:-translate-y-0.5 hover:bg-[#9be022]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
          <a
            href="mailto:hola@agenciacreativia.com"
            className="inline-flex items-center gap-2 rounded-full border border-[#272255]/20 bg-white px-6 py-3 text-sm font-semibold text-[#272255] transition hover:-translate-y-0.5 hover:border-[#272255]"
          >
            <Mail className="h-4 w-4" />
            Reportar el problema
          </a>
        </div>
      </div>
    </main>
  );
}
