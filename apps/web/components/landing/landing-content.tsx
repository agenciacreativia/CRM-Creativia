import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Twitter,
  Youtube,
} from "lucide-react";
import { Hero } from "./hero";
import { BeforeAfter } from "./before-after";
import { FeaturesGrid } from "./features-grid";
import { OperationSection } from "./operation-section";
import { Testimonials } from "./testimonials";
import { Pricing } from "./pricing";
import { FinalCTA } from "./final-cta";

/* =========================================================================
   FLAGS DE PLACEHOLDERS (datos ficticios pendientes de respaldar).
   Cuando tengas data real → cambiar a false para ocultar el bloque.
   ========================================================================= */
const SHOW_PLACEHOLDER_TRUSTBAR_STATS = true; // "300+ agencias", "$2.4M", "99% satisfacción"

/* ------------------- DATA ------------------- */

const FAQS = [
  {
    q: "¿Puedo probar Turistea CRM antes de pagar?",
    a: "Sí, podés probarlo gratis sin necesidad de tarjeta de crédito. Activamos tu cuenta y te guiamos en el onboarding.",
  },
  {
    q: "¿Mis datos están seguros con Turistea CRM?",
    a: "Cada agencia tiene su espacio cifrado y aislado. Tu información está respaldada y nunca se mezcla con la de otras agencias.",
  },
  {
    q: "¿Necesito tarjeta de crédito para probar?",
    a: "No. La prueba gratuita no requiere ningún medio de pago. Decidís cuando termina si seguís con un plan o no.",
  },
  {
    q: "¿Turistea CRM se integra con otras plataformas?",
    a: "Sí, ofrecemos integraciones con pasarelas de pago, proveedores turísticos, herramientas de email y más. En planes Enterprise armamos integraciones a medida.",
  },
  {
    q: "¿Ofrecen capacitación y soporte en español?",
    a: "Por supuesto. Todo nuestro equipo es hispanohablante y la capacitación de tu equipo está incluida en todos los planes.",
  },
  {
    q: "¿Puedo cancelar en cualquier momento?",
    a: "Sí. La suscripción es mes a mes, sin permanencia ni penalizaciones. Si cancelás, mantenés el acceso hasta el fin del período facturado.",
  },
];

/* ------------------- NAV ------------------- */

function NavBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/landing-v2/images/logo.png"
            alt="Turistea CRM"
            width={420}
            height={120}
            className="h-9 w-auto"
            priority
          />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-[#081d2d] md:flex">
          <a href="#producto" className="hover:text-[#272255]">Funciones</a>
          <a href="#producto" className="inline-flex items-center gap-1 hover:text-[#272255]">
            Viajes <ChevronDown className="h-3 w-3" />
          </a>
          <a href="#precios" className="hover:text-[#272255]">Precios</a>
          <a href="#recursos" className="inline-flex items-center gap-1 hover:text-[#272255]">
            Recursos <ChevronDown className="h-3 w-3" />
          </a>
        </nav>
        <Link
          href="/login"
          className="rounded-full bg-[#aaf52b] px-5 py-2.5 text-sm font-bold text-[#120b40] shadow-[0_4px_12px_rgba(170,245,43,0.4)] transition hover:-translate-y-0.5 hover:bg-[#9be022]"
        >
          Ver demo
        </Link>
      </div>
    </header>
  );
}

/* ------------------- TRUST BAR ------------------- */
/*
  Cuando SHOW_PLACEHOLDER_TRUSTBAR_STATS = true mostramos 6 stats (incluye
  placeholders "300+ agencias", "$2.4M", "99% satisfacción"). Cuando = false
  caemos a la versión honesta con sólo 3 items verificables.
*/
function TrustBar() {
  const VERIFICABLES = [
    { title: "CRM hecho", sub: "para agencias de viajes" },
    { title: "Actualizaciones", sub: "constantes" },
    { title: "Soporte en español", sub: "24/7" },
  ];
  const PLACEHOLDERS = [
    { title: "300+", sub: "agencias ya confían en Turistea", placeholder: true },
    { title: "$2.4M+", sub: "dólares en ventas gestionadas cada mes", placeholder: true },
    { title: "99%", sub: "satisfacción del cliente", placeholder: true },
    { title: "#1", sub: "CRM para agencias de viajes" },
    { title: "Actualizaciones", sub: "constantes" },
    { title: "Soporte", sub: "en español 24/7" },
  ];
  const ITEMS = SHOW_PLACEHOLDER_TRUSTBAR_STATS ? PLACEHOLDERS : VERIFICABLES;
  const cols = SHOW_PLACEHOLDER_TRUSTBAR_STATS ? "sm:grid-cols-3 lg:grid-cols-6" : "sm:grid-cols-3";

  return (
    <section className="border-y border-black/5 bg-white py-8">
      <div className={`mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 ${cols}`}>
        {ITEMS.map((it) => (
          <div key={`${it.title}-${it.sub}`} className="flex items-center justify-center gap-2 text-center sm:gap-3">
            <span className="hidden h-2 w-2 flex-shrink-0 rounded-full bg-[#aaf52b] sm:inline-block" aria-hidden />
            <div>
              <p className="text-lg font-extrabold text-[#120b40]">{it.title}</p>
              <p className="text-[11px] leading-tight text-[#47464f]">{it.sub}</p>
            </div>
          </div>
        ))}
      </div>
      {SHOW_PLACEHOLDER_TRUSTBAR_STATS && (
        <p className="mx-auto mt-4 max-w-6xl px-5 text-center text-[10px] uppercase tracking-wider text-[#787680]/60">
          * Cifras de muestra — pendientes de validar con datos reales
        </p>
      )}
    </section>
  );
}

/* ------------------- FAQ ------------------- */

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

/* ------------------- FOOTER ------------------- */

function Footer() {
  return (
    <footer className="bg-[#000417] text-[#e8f2ff]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Image
            src="/landing-v2/images/logo.png"
            alt="Turistea CRM"
            width={420}
            height={120}
            className="h-10 w-auto brightness-0 invert"
          />
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            El CRM visual #1 para agencias de viajes que quieren vender mejor.
          </p>
          <div className="mt-5 flex gap-3">
            <a aria-label="Facebook" href="#" className="text-white/60 transition hover:text-white">
              <Facebook className="h-5 w-5" />
            </a>
            <a aria-label="Instagram" href="#" className="text-white/60 transition hover:text-white">
              <Instagram className="h-5 w-5" />
            </a>
            <a aria-label="LinkedIn" href="#" className="text-white/60 transition hover:text-white">
              <Linkedin className="h-5 w-5" />
            </a>
            <a aria-label="Twitter" href="#" className="text-white/60 transition hover:text-white">
              <Twitter className="h-5 w-5" />
            </a>
            <a aria-label="YouTube" href="#" className="text-white/60 transition hover:text-white">
              <Youtube className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Producto</h4>
          <ul className="space-y-2.5 text-sm text-white/70">
            <li><a href="#producto" className="hover:text-white">Funciones</a></li>
            <li><a href="#producto" className="hover:text-white">IA Turistea</a></li>
            <li><a href="#precios" className="hover:text-white">Precios</a></li>
            <li><a href="#producto" className="hover:text-white">Integraciones</a></li>
            <li><a href="#" className="hover:text-white">Actualizaciones</a></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Recursos</h4>
          <ul className="space-y-2.5 text-sm text-white/70">
            <li><a href="#" className="hover:text-white">Blog</a></li>
            <li><a href="#" className="hover:text-white">Guías y eBooks</a></li>
            <li><a href="#" className="hover:text-white">Webinars</a></li>
            <li><a href="#" className="hover:text-white">Centro de ayuda</a></li>
            <li><a href="#" className="hover:text-white">Comunidad</a></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Empresa & Legal</h4>
          <ul className="space-y-2.5 text-sm text-white/70">
            <li><a href="#" className="hover:text-white">Nosotros</a></li>
            <li><a href="#" className="hover:text-white">Clientes</a></li>
            <li><a href="#" className="hover:text-white">Contacto</a></li>
            <li><a href="#" className="hover:text-white">Términos y condiciones</a></li>
            <li><a href="#" className="hover:text-white">Privacidad</a></li>
          </ul>
          <ul className="mt-5 space-y-2.5 text-sm text-white/70">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 flex-shrink-0 text-[#aaf52b]" />
              <a href="mailto:hola@turisteacrm.com" className="hover:text-white">hola@turisteacrm.com</a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0 text-[#aaf52b]" />
              <span>México · LATAM</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-5 sm:flex-row">
          <p className="text-xs text-white/40">
            © 2026 Turistea CRM by Creativia. Todos los derechos reservados.
          </p>
          <p className="text-xs text-white/40">
            Hecho con <span className="text-[#ea6a30]">❤</span> en México
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------- PAGE ------------------- */

export default function LandingContent() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[#081d2d]">
      <NavBar />
      <Hero />
      <TrustBar />
      <BeforeAfter />
      <FeaturesGrid />
      <OperationSection />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
