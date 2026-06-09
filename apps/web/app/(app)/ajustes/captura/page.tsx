import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getTenantFromHeaders } from "@/lib/tenant";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/ui/page-header";
import { CodeSnippet } from "./code-snippet";

export default async function CapturaPage() {
  const me = await getSessionUser();
  if (me?.rol !== "admin") redirect("/dashboard");
  const tenant = await getTenantFromHeaders();
  const sub = tenant?.subdominio ?? "tu-agencia";

  const scheme = env.BASE_DOMAIN.includes("localhost") ? "http" : "https";
  const endpoint = `${scheme}://${sub}.${env.BASE_DOMAIN}/api/leads/${sub}`;

  const snippet = `<form id="crm-lead-form">
  <input name="nombre" placeholder="Nombre" required />
  <input name="email" type="email" placeholder="Email" required />
  <input name="telefono" placeholder="Teléfono" />
  <input name="empresa" placeholder="Empresa (opcional)" />
  <textarea name="mensaje" placeholder="¿En qué te ayudamos?"></textarea>
  <button type="submit">Enviar</button>
</form>
<script>
  document.getElementById('crm-lead-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const res = await fetch('${endpoint}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) { e.target.reset(); alert('¡Gracias! Te contactaremos pronto.'); }
    else { alert('No se pudo enviar. Intentá de nuevo.'); }
  });
</script>`;

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        title="Captura de leads"
        subtitle="Pegá este formulario en tu sitio web. Cada envío crea automáticamente un contacto y una oportunidad en tu CRM (origen «web»)."
        backHref="/ajustes"
        backLabel="Ajustes"
      />

      <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-6">
        <div>
          <h2 className="text-sm font-bold uppercase text-gray-500">Endpoint</h2>
          <p className="mt-1 break-all rounded bg-gray-50 px-3 py-2 text-xs text-gray-700">{endpoint}</p>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase text-gray-500">Formulario embebible</h2>
          <CodeSnippet code={snippet} label="HTML + JS — pegalo en tu web" />
        </div>
        <ul className="list-disc space-y-1 pl-5 text-xs text-gray-500">
          <li>Campos: <code>nombre</code> y <code>email</code> son obligatorios; <code>telefono</code>, <code>empresa</code> y <code>mensaje</code> opcionales.</li>
          <li>Los leads entran al primer embudo y respetan los topes de tu plan (lista de espera si te excedés).</li>
          <li>Podés estilizar el formulario libremente; solo mantené los <code>name</code> de los campos.</li>
        </ul>
      </section>
    </div>
  );
}
