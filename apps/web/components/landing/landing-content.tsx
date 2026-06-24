import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  Frown,
  Layers,
  LineChart,
  Mail,
  MapPin,
  Phone,
  PiggyBank,
  Plane,
  Repeat,
  ShieldCheck,
  Smile,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  Workflow,
  XCircle,
  Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    icon: Workflow,
    title: "Pipeline de ventas visual",
    text: "Arrastra cada cotización por sus etapas (No cotizado → Cotizado → Reserva → Ganada). Nunca más una oportunidad olvidada en un chat.",
  },
  {
    icon: Users,
    title: "Clientes y contactos centralizados",
    text: "Todo el historial de cada pasajero y agencia en una ficha: viajes previos, preferencias, comunicaciones y documentos.",
  },
  {
    icon: CalendarClock,
    title: "Salidas y hitos automáticos",
    text: "Controla los días previos por aerolínea, fechas límite de pago y check-list de cada salida. Recordatorios que evitan multas y cancelaciones.",
  },
  {
    icon: Plane,
    title: "Maestros del negocio turístico",
    text: "Aerolíneas, operadores, destinos, zonas y categorías ya pensados para turismo. No adaptes un CRM genérico: este ya habla tu idioma.",
  },
  {
    icon: PiggyBank,
    title: "Comisiones y metas",
    text: "Calcula comisiones por counter, vendedor externo y gerente. Mide cumplimiento de meta y sobre-comisión sin planillas manuales.",
  },
  {
    icon: Target,
    title: "Segmentación RFM (Oro / Plata / Bronce)",
    text: "El sistema clasifica solo a tus agencias y clientes por valor real. Sabes a quién atender primero y dónde está tu dinero.",
  },
  {
    icon: BarChart3,
    title: "Dashboards y forecast",
    text: "KPIs en vivo, embudo de conversión y proyección de ventas. Decisiones con datos, no con corazonadas.",
  },
  {
    icon: Building2,
    title: "Multi-sucursal y multi-equipo",
    text: "Gestiona varias sucursales, asesores responsables y territorios desde una sola cuenta, con permisos por rol.",
  },
  {
    icon: ShieldCheck,
    title: "Datos seguros y aislados",
    text: "Cada agencia con su propio espacio cifrado y aislado. Tu información nunca se mezcla con la de nadie más.",
  },
];

const PAINS = [
  {
    sin: "Clientes y cotizaciones regados entre WhatsApp, Excel y correos.",
    con: "Todo centralizado en una sola plataforma accesible desde cualquier lugar.",
  },
  {
    sin: "Oportunidades que se enfrían y se pierden por falta de seguimiento.",
    con: "Recordatorios automáticos y pipeline que te dice a quién contactar hoy.",
  },
  {
    sin: "No sabes cuánto vas a vender este mes ni quién es tu mejor cliente.",
    con: "Forecast y segmentación RFM que te muestran el dinero en tiempo real.",
  },
  {
    sin: "Comisiones calculadas a mano: errores, reclamos y horas perdidas.",
    con: "Comisiones y metas calculadas solas por counter y vendedor.",
  },
  {
    sin: "Se te pasan fechas de pago y hitos de salida → multas y clientes molestos.",
    con: "Alertas de días previos por aerolínea y check-list de cada salida.",
  },
  {
    sin: "Si un asesor renuncia, se lleva la cartera en su celular.",
    con: "La cartera vive en la agencia, no en el teléfono de nadie.",
  },
];

const STATS = [
  { icon: TrendingUp, value: "+30%", label: "más cierres con seguimiento ordenado" },
  { icon: Clock, value: "10 h", label: "ahorradas por semana en tareas manuales" },
  { icon: Repeat, value: "x3", label: "más recompra al conocer a tu cliente" },
  { icon: XCircle, value: "0", label: "oportunidades olvidadas en un chat" },
];

const PLANS = [
  {
    name: "Lite",
    tagline: "Para arrancar a ordenar tu agencia",
    price: "29",
    badge: null as string | null,
    cta: "Empezar con Lite",
    highlight: false,
    features: [
      "Hasta 3 usuarios",
      "Pipeline de ventas visual",
      "Clientes y contactos ilimitados",
      "Gestión de cotizaciones y oportunidades",
      "Maestros de turismo (aerolíneas, destinos, operadores)",
      "App accesible desde cualquier dispositivo",
      "Soporte por correo",
    ],
    notIncluded: ["Dashboards avanzados", "Comisiones automáticas", "Multi-sucursal"],
  },
  {
    name: "Premium",
    tagline: "El favorito de las agencias que quieren crecer",
    price: "69",
    badge: "Más popular",
    cta: "Quiero Premium",
    highlight: true,
    features: [
      "Hasta 10 usuarios",
      "Todo lo de Lite, y además:",
      "Salidas, hitos y alertas por aerolínea",
      "Comisiones y metas automáticas",
      "Dashboards, KPIs y forecast de ventas",
      "Segmentación RFM (Oro / Plata / Bronce)",
      "Multi-sucursal y permisos por rol",
      "Soporte prioritario por chat",
    ],
    notIncluded: ["Integraciones a medida", "Onboarding dedicado"],
  },
  {
    name: "Ultimate",
    tagline: "Para redes y mayoristas que escalan en serio",
    price: "129",
    badge: "Todo incluido",
    cta: "Hablar de Ultimate",
    highlight: false,
    features: [
      "Usuarios ilimitados",
      "Todo lo de Premium, y además:",
      "Reportes y tableros personalizados",
      "Integraciones a medida (correo, WhatsApp, BI)",
      "Onboarding y migración de datos dedicada",
      "Capacitación del equipo en vivo",
      "Gerente de cuenta asignado",
      "Soporte 24/7 con SLA",
    ],
    notIncluded: [],
  },
];

const BENEFITS = [
  { icon: Zap, title: "Vende más rápido", text: "Cotiza, da seguimiento y cierra sin saltar entre 5 herramientas." },
  { icon: Smile, title: "Clientes más felices", text: "Atención personalizada con todo su historial a un clic." },
  { icon: LineChart, title: "Controlas el negocio", text: "Sabes qué vendes, quién vende y qué viene el próximo mes." },
  { icon: Layers, title: "Equipo alineado", text: "Todos trabajan sobre la misma información, sin islas de Excel." },
  { icon: Bell, title: "Nada se te escapa", text: "Alertas de pagos, hitos y seguimientos en el momento justo." },
  { icon: Sparkles, title: "Crece sin caos", text: "Suma sucursales y asesores sin perder el control." },
];

const FAQS = [
  {
    q: "¿Necesito conocimientos técnicos para usarlo?",
    a: "No. Turistea CRM está pensado para counters y asesores de viaje. Si usas WhatsApp y Excel, lo vas a dominar en una tarde.",
  },
  {
    q: "¿Puedo migrar mis clientes actuales?",
    a: "Sí. Importamos tus clientes, cotizaciones e historial desde Excel u otros CRM. En el plan Ultimate la migración es dedicada y la hacemos nosotros.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Cada agencia tiene su espacio cifrado y aislado. Nadie fuera de tu equipo puede ver tu información, ni siquiera otras agencias.",
  },
  {
    q: "¿Puedo cambiar de plan después?",
    a: "Cuando quieras. Empieza con Lite y sube a Premium o Ultimate a medida que tu agencia crece. Sin penalizaciones.",
  },
];

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function LandingContent() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[var(--brand-navy)]">
      {/* ---------------- NAV ---------------- */}
      <header className="sticky top-0 z-30 border-b border-[var(--glass-border)] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Image src="/turistea-crm.svg" alt="Turistea CRM" width={1677} height={451} priority className="h-10 w-auto" />
          <nav className="hidden items-center gap-8 text-sm font-medium text-[var(--ink-soft)] md:flex">
            <a href="#beneficios" className="transition hover:text-[var(--brand-navy)]">Beneficios</a>
            <a href="#comparativa" className="transition hover:text-[var(--brand-navy)]">Con vs. sin CRM</a>
            <a href="#caracteristicas" className="transition hover:text-[var(--brand-navy)]">Características</a>
            <a href="#precios" className="transition hover:text-[var(--brand-navy)]">Precios</a>
          </nav>
          <a
            href="/login"
            className="rounded-full bg-[var(--brand-navy)] px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[var(--brand-navy-deep)]"
          >
            Iniciar sesión
          </a>
        </div>
      </header>

      {/* ---------------- HERO (2 columnas) ---------------- */}
      <section className="relative overflow-hidden">
        {/* fondo sutil */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] bg-gradient-to-b from-[#f6f8fc] to-white" />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-16 lg:grid-cols-2 lg:gap-10 lg:pb-28 lg:pt-24">
          {/* IZQUIERDA — copy */}
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-white px-4 py-1.5 text-xs font-semibold text-[var(--brand-navy)] shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-[var(--brand-orange)]" />
              El CRM hecho a medida para agencias de viajes
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-[var(--brand-navy)] sm:text-5xl lg:text-[56px]">
              Deja de perder ventas entre{" "}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10">WhatsApp y Excel</span>
                <span className="absolute bottom-1.5 left-0 z-0 h-3.5 w-full bg-[var(--brand-green)] opacity-60" />
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--ink-soft)] lg:mx-0 lg:text-xl">
              Centraliza clientes, cotizaciones, salidas y comisiones en un solo lugar.
              Tu agencia vende más, da mejor servicio y crece sin caos —{" "}
              <strong className="text-[var(--brand-navy)]">desde el primer día</strong>.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <a
                href="#precios"
                className="group inline-flex items-center gap-2 rounded-full bg-[var(--brand-navy)] px-7 py-3.5 text-base font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[var(--brand-navy-deep)]"
              >
                Ver planes y precios
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </a>
              <a
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-white px-7 py-3.5 text-base font-semibold text-[var(--brand-navy)] transition hover:-translate-y-0.5 hover:border-[var(--brand-navy)]"
              >
                Iniciar sesión
              </a>
            </div>

            <p className="mt-5 text-sm text-[var(--ink-faint)]">
              Sin tarjeta para empezar · Migramos tus datos · Cancela cuando quieras
            </p>
          </div>

          {/* DERECHA — mockup del producto (MacBook + iPhone) */}
          <div className="relative lg:-mr-6">
            <Image
              src="/landing/images/mockup-laptop-phone.png"
              alt="Turistea CRM en MacBook y iPhone — tablero de oportunidades"
              width={1448}
              height={1086}
              priority
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      {/* ---------------- STATS ---------------- */}
      <section className="border-y border-[var(--glass-border)] bg-[#fafafb]">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-px overflow-hidden px-5 py-4 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="px-4 py-6 text-center">
              <s.icon className="mx-auto h-6 w-6 text-[var(--brand-green-deep)]" />
              <div className="mt-3 text-3xl font-extrabold text-[var(--brand-navy)] md:text-4xl">{s.value}</div>
              <div className="mt-1 text-xs leading-snug text-[var(--ink-soft)]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- BENEFITS ---------------- */}
      <section id="beneficios" className="mx-auto max-w-6xl px-5 py-24">
        <SectionHeading
          eyebrow="Por qué tu agencia lo va a amar"
          title="Todo lo que ganas con Turistea CRM"
          subtitle="No es una herramienta más: es la que reemplaza a todas las otras."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="rounded-2xl border border-[var(--glass-border)] bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-navy)] text-white">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[var(--brand-navy)]">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- COMPARATIVA SIN / CON ---------------- */}
      <section id="comparativa" className="border-y border-[var(--glass-border)] bg-[#fafafb]">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <SectionHeading
            eyebrow="La diferencia es brutal"
            title="Agencias sin CRM vs. agencias con Turistea"
            subtitle="Estos son los dolores que escuchamos todos los días… y cómo desaparecen."
          />
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {/* SIN */}
            <div className="rounded-3xl border border-[rgba(240,112,138,0.3)] bg-[rgba(240,112,138,0.07)] p-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--red-soft)] text-white">
                  <Frown className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-[var(--brand-navy)]">Hoy, sin CRM</h3>
              </div>
              <ul className="space-y-3.5">
                {PAINS.map((p) => (
                  <li key={p.sin} className="flex gap-3 text-sm text-[var(--ink-soft)]">
                    <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--red-soft)]" />
                    <span>{p.sin}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* CON */}
            <div className="card-featured p-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-green)] text-[var(--brand-navy)]">
                  <Smile className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-white">Con Turistea CRM</h3>
              </div>
              <ul className="space-y-3.5">
                {PAINS.map((p) => (
                  <li key={p.con} className="flex gap-3 text-sm text-white/90">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--brand-green)]" />
                    <span>{p.con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- CARACTERÍSTICAS ---------------- */}
      <section id="caracteristicas" className="mx-auto max-w-6xl px-5 py-24">
        <SectionHeading
          eyebrow="Hecho para turismo, no genérico"
          title="Características que de verdad usas"
          subtitle="Cada función nació de cómo trabaja realmente una agencia de viajes."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-[var(--glass-border)] bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(149,222,0,0.15)] text-[var(--brand-green-deep)]">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-[var(--brand-navy)]">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- PRECIOS ---------------- */}
      <section id="precios" className="border-y border-[var(--glass-border)] bg-[#fafafb]">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <SectionHeading
            eyebrow="Planes para cada tamaño de agencia"
            title="Elige el plan que crece contigo"
            subtitle="Precios en USD / mes. Empieza chico y sube cuando lo necesites. Sin contratos atados."
          />

          <div className="mt-14 grid items-start gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={
                  plan.highlight
                    ? "card-featured relative p-8 lg:-mt-4 lg:scale-[1.03]"
                    : "relative rounded-3xl border border-[var(--glass-border)] bg-white p-8"
                }
              >
                {plan.badge && (
                  <span
                    className={
                      "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold " +
                      (plan.highlight
                        ? "bg-[var(--brand-green)] text-[var(--brand-navy)]"
                        : "bg-[var(--brand-navy)] text-white")
                    }
                  >
                    {plan.badge}
                  </span>
                )}

                <h3 className={`text-2xl font-extrabold ${plan.highlight ? "text-white" : "text-[var(--brand-navy)]"}`}>
                  {plan.name}
                </h3>
                <p className={`mt-1 text-sm ${plan.highlight ? "text-white/80" : "text-[var(--ink-soft)]"}`}>
                  {plan.tagline}
                </p>

                <div className="mt-6 flex items-end gap-1">
                  <span className={`text-sm font-semibold ${plan.highlight ? "text-white/70" : "text-[var(--ink-faint)]"}`}>$</span>
                  <span className={`text-5xl font-extrabold ${plan.highlight ? "text-white" : "text-[var(--brand-navy)]"}`}>
                    {plan.price}
                  </span>
                  <span className={`mb-1.5 text-sm ${plan.highlight ? "text-white/70" : "text-[var(--ink-faint)]"}`}>
                    /mes
                  </span>
                </div>

                <a
                  href="/login"
                  className={
                    "mt-6 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5 " +
                    (plan.highlight
                      ? "bg-[var(--brand-green)] text-[var(--brand-navy)] hover:bg-[var(--brand-green-deep)]"
                      : "bg-[var(--brand-navy)] text-white hover:bg-[var(--brand-navy-deep)]")
                  }
                >
                  {plan.cta}
                  <ArrowRight className="h-4 w-4" />
                </a>

                <ul className="mt-7 space-y-3">
                  {plan.features.map((feat) => (
                    <li
                      key={feat}
                      className={`flex gap-2.5 text-sm ${plan.highlight ? "text-white/90" : "text-[var(--ink-soft)]"}`}
                    >
                      <CheckCircle2
                        className={`mt-0.5 h-4 w-4 flex-shrink-0 ${plan.highlight ? "text-[var(--brand-green)]" : "text-[var(--brand-green-deep)]"}`}
                      />
                      <span>{feat}</span>
                    </li>
                  ))}
                  {plan.notIncluded.map((feat) => (
                    <li key={feat} className="flex gap-2.5 text-sm text-[var(--ink-faint)] line-through">
                      <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 opacity-60" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-[var(--ink-faint)]">
            ¿Eres una red o mayorista con necesidades especiales?{" "}
            <a href="#contacto" className="font-semibold text-[var(--brand-navy)] underline">
              Armamos un plan a tu medida.
            </a>
          </p>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="mx-auto max-w-4xl px-5 py-24">
        <SectionHeading eyebrow="Antes de decidir" title="Preguntas frecuentes" subtitle={null} />
        <div className="mt-12 space-y-4">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-2xl border border-[var(--glass-border)] bg-white p-6">
              <h3 className="flex items-start gap-2 text-base font-bold text-[var(--brand-navy)]">
                <Star className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--brand-orange)]" />
                {f.q}
              </h3>
              <p className="mt-2 pl-6 text-sm leading-relaxed text-[var(--ink-soft)]">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- FINAL CTA ---------------- */}
      <section id="contacto" className="mx-auto max-w-6xl px-5 pb-24">
        <div className="card-featured px-6 py-16 text-center md:px-16">
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold leading-tight text-white md:text-4xl">
            Tu próxima venta ya está en tu base de clientes. <br className="hidden md:block" />
            Empieza a aprovecharla hoy.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/85">
            Únete a las agencias que dejaron el caos del Excel y hoy venden con orden,
            datos y seguimiento. Te acompañamos en la migración.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-green)] px-8 py-3.5 text-base font-bold text-[var(--brand-navy)] transition hover:-translate-y-0.5 hover:bg-[var(--brand-green-deep)]"
            >
              Iniciar sesión
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="mailto:hola@agenciacreativia.com"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
            >
              <Mail className="h-4 w-4" />
              Hablar con ventas
            </a>
          </div>
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="border-t border-[var(--glass-border)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 py-10 md:flex-row">
          <Image src="/turistea-crm.svg" alt="Turistea CRM" width={1677} height={451} className="h-11 w-auto" />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[var(--ink-soft)]">
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> LATAM</span>
            <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4" /> hola@agenciacreativia.com</span>
            <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4" /> +51 999 999 999</span>
          </div>
          <p className="text-xs text-[var(--ink-faint)]">
            © 2026 Turistea CRM · por Agencia Creativia
          </p>
        </div>
      </footer>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string | null;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand-green-deep)]">
        {eyebrow}
      </span>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--brand-navy)] md:text-[40px] md:leading-tight">
        {title}
      </h2>
      {subtitle && <p className="mt-4 text-base text-[var(--ink-soft)] md:text-lg">{subtitle}</p>}
    </div>
  );
}
