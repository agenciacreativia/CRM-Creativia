import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Plane,
  X,
} from "lucide-react";
import { Hero } from "./hero";
import { FeaturesGrid } from "./features-grid";
import { Pricing } from "./pricing";

/* ---------------- DATA ---------------- */

const ANTES = [
  { title: "Excel disperso", text: "Datos en archivos, versiones y copias." },
  { title: "Leads olvidados", text: "Seguimiento manual y oportunidades perdidas." },
  { title: "No sabés el forecast", text: "Sin visibilidad real de tu embudo." },
  { title: "Seguimiento manual", text: "Tareas, recordatorios y notas en todos lados." },
];

const DESPUES = [
  { title: "Todo centralizado", text: "Clientes, cotizaciones, salidas y comisiones en un lugar." },
  { title: "Recordatorios automáticos", text: "Alertas por tiempo, tareas y próximos hitos." },
  { title: "Dashboard en vivo", text: "Pipeline, ventas y objetivos siempre actualizados." },
  { title: "Seguimiento ordenado", text: "Actividades, notas y comunicaciones en contexto." },
];

const OPERATION_BULLETS = [
  "Pipeline por etapas con alertas",
  "KPIs de ventas y cotizaciones",
  "Top destinos y productos",
  "Actividades y tareas del equipo",
];

const FAQS = [
  {
    q: "¿Puedo importar mis datos desde Excel?",
    a: "Sí. Soportamos importación directa de Excel y CSV para contactos, empresas y oportunidades. En planes superiores la migración es asistida por nuestro equipo.",
  },
  {
    q: "¿Cuánto tiempo toma implementar Turistea CRM?",
    a: "La mayoría de agencias está operando en uno o dos días. El onboarding guiado cubre la configuración inicial, importación de datos y entrenamiento del equipo.",
  },
  {
    q: "¿Qué métodos de pago aceptan?",
    a: "Aceptamos tarjeta de crédito, débito automático bancario en Colombia y transferencias para planes anuales. Para clientes Enterprise emitimos factura corporativa.",
  },
  {
    q: "¿Puedo cancelar mi plan cuando quiera?",
    a: "Cuando quieras y sin penalizaciones. La suscripción es mes a mes; cancelás y mantenés el acceso hasta el final del período facturado.",
  },
];

/* ---------------- COMPONENTS ---------------- */

function NavBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/landing/images/logo-turistea-crm.png"
            alt="Turistea CRM"
            width={560}
            height={120}
            className="h-9 w-auto"
            priority
          />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-[#081d2d] md:flex">
          <a href="#producto" className="hover:text-[#272255]">Producto</a>
          <a href="#precios" className="hover:text-[#272255]">Precios</a>
          <a href="#recursos" className="hover:text-[#272255]">Recursos</a>
        </nav>
        <Link
          href="/login"
          className="rounded-full bg-[#aaf52b] px-5 py-2.5 text-sm font-bold text-[#120b40] shadow-[0_4px_12px_rgba(170,245,43,0.4)] transition hover:-translate-y-0.5 hover:bg-[#9be022]"
        >
          Probar gratis
        </Link>
      </div>
    </header>
  );
}

function SocialProofBand() {
  // No metemos números falsos. Cuando tengas data real (clientes pagos +
  // viajes vendidos verificables) volvemos a activar este bloque.
  return null;
}

function BeforeAfter() {
  return (
    <section id="producto" className="bg-[#f7f9ff] py-20">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-[#120b40] md:text-4xl">
          Del caos al control
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {/* ANTES */}
          <div className="rounded-2xl border border-[#ea6a30]/25 bg-[#fff5f0] p-7">
            <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-[#ea6a30]">
              Antes: así trabajabas
            </h3>
            <ul className="space-y-4">
              {ANTES.map((it) => (
                <li key={it.title} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#ea6a30] text-white">
                    <X className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <div>
                    <p className="font-bold text-[#120b40]">{it.title}</p>
                    <p className="text-sm text-[#47464f]">{it.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* DESPUÉS */}
          <div className="rounded-2xl border border-[#aaf52b]/40 bg-[#f4fce6] p-7">
            <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-[#446900]">
              Después: así crecés
            </h3>
            <ul className="space-y-4">
              {DESPUES.map((it) => (
                <li key={it.title} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#446900] text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <div>
                    <p className="font-bold text-[#120b40]">{it.title}</p>
                    <p className="text-sm text-[#47464f]">{it.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function OperationSection() {
  return (
    <section className="bg-[#f7f9ff] py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#120b40] md:text-[40px] md:leading-tight">
            Tu operación bajo control, en tiempo real
          </h2>
          <p className="mt-4 text-base text-[#47464f]">
            Visualizá tu pipeline, ventas y objetivos en un dashboard diseñado para
            agencias de viajes.
          </p>
          <ul className="mt-6 space-y-3">
            {OPERATION_BULLETS.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-sm text-[#081d2d]">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[#aaf52b]" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_24px_64px_rgba(31,50,67,0.12)]">
          <Image
            src="/landing/images/screenshot-kanban-desktop.png"
            alt="Dashboard de Turistea CRM"
            width={1912}
            height={908}
            className="h-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section id="recursos" className="bg-[#f7f9ff] py-20">
      <div className="mx-auto max-w-3xl px-5">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-[#120b40] md:text-4xl">
          Preguntas frecuentes
        </h2>

        <div className="mt-10 space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-black/5 bg-white p-5 transition open:shadow-[0_8px_24px_rgba(31,50,67,0.08)]"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-bold text-[#120b40] [&::-webkit-details-marker]:hidden">
                <span>{f.q}</span>
                <ChevronDown className="h-5 w-5 flex-shrink-0 text-[#272255] transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[#47464f]">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-[#120b40] py-16 text-white">
      <Plane
        aria-hidden
        className="pointer-events-none absolute right-10 top-8 h-7 w-7 rotate-12 text-[#aaf52b]/30"
      />
      <div className="mx-auto max-w-4xl px-5 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          Dejá el caos atrás y vendé con más control
        </h2>
        <p className="mt-4 text-white/75">
          Probá Turistea CRM gratis por 14 días. Sin tarjeta de crédito.
        </p>
        <Link
          href="/login"
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#aaf52b] px-8 py-3.5 text-base font-bold text-[#120b40] shadow-[0_8px_24px_rgba(170,245,43,0.4)] transition hover:-translate-y-0.5 hover:bg-[#9be022]"
        >
          Probar gratis 14 días
          <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-5 text-sm text-white/60">
          Setup rápido · Soporte humano · Cancelá cuando quieras
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#000417] text-[#e8f2ff]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Image
            src="/landing/images/logo-turistea-crm.png"
            alt="Turistea CRM"
            width={560}
            height={120}
            className="h-10 w-auto brightness-0 invert"
          />
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            El CRM diseñado para mayoristas y agencias de viajes en LATAM.
          </p>
          <div className="mt-5 flex gap-3">
            <a aria-label="LinkedIn" href="#" className="text-white/60 transition hover:text-white">
              <Linkedin className="h-5 w-5" />
            </a>
            <a aria-label="Instagram" href="#" className="text-white/60 transition hover:text-white">
              <Instagram className="h-5 w-5" />
            </a>
            <a aria-label="Facebook" href="#" className="text-white/60 transition hover:text-white">
              <Facebook className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Producto</h4>
          <ul className="space-y-2.5 text-sm text-white/70">
            <li><a href="#producto" className="hover:text-white">Funcionalidades</a></li>
            <li><a href="#precios" className="hover:text-white">Precios</a></li>
            <li><Link href="/login" className="hover:text-white">Iniciar sesión</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Empresa</h4>
          <ul className="space-y-2.5 text-sm text-white/70">
            <li><a href="#" className="hover:text-white">Nosotros</a></li>
            <li><a href="#" className="hover:text-white">Clientes</a></li>
            <li><a href="#recursos" className="hover:text-white">Recursos</a></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">¿Hablamos?</h4>
          <ul className="space-y-3 text-sm text-white/70">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 flex-shrink-0 text-[#aaf52b]" />
              <a href="mailto:hola@turisteacrm.com" className="hover:text-white">hola@turisteacrm.com</a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0 text-[#aaf52b]" />
              <span>Bogotá, Colombia</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-5 sm:flex-row">
          <p className="text-xs text-white/40">
            © 2026 Turistea CRM by Creativia. Todos los derechos reservados.
          </p>
          <div className="flex gap-4 text-xs text-white/40">
            <a href="#" className="hover:text-white">Términos y condiciones</a>
            <a href="#" className="hover:text-white">Política de privacidad</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- PAGE ---------------- */

export default function LandingContent() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[#081d2d]">
      <NavBar />
      <Hero />
      <SocialProofBand />
      <BeforeAfter />
      <FeaturesGrid />
      <OperationSection />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
