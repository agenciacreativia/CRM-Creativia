import Link from "next/link";
import { Download, Wrench } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export default function ApiDocsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentación API v1"
        subtitle="Una API REST simple y multi-tenant. Una sola API key activa por cuenta, con límite mensual configurable. Si se excede, los leads entrantes van automáticamente a la lista de espera y no se pierden."
        backHref="/ajustes/integraciones"
        backLabel="Integraciones"
      />
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <Link href="/api/v1/openapi.json" className="inline-flex items-center gap-1 text-brand-primary hover:underline" target="_blank">
          <Download className="h-3.5 w-3.5" /> Spec OpenAPI 3.1 (JSON)
        </Link>
        <span className="text-gray-300">·</span>
        <a href="https://editor.swagger.io/?url=https://turisteacrm.com/api/v1/openapi.json" className="inline-flex items-center gap-1 text-brand-primary hover:underline" target="_blank" rel="noopener noreferrer">
          <Wrench className="h-3.5 w-3.5" /> Abrir en Swagger Editor
        </a>
      </p>

      <Section title="Autenticación">
        <p>Cada request requiere el header <Code>Authorization: Bearer crm_…</Code>. Generá la key en <Link href="/ajustes/integraciones" className="text-brand-primary underline">Integraciones</Link>.</p>
        <Pre>{`curl -H "Authorization: Bearer crm_xxxx" https://tu-agencia.turistea.app/api/v1/contactos`}</Pre>
      </Section>

      <Section title="Recursos disponibles">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li><Code>/api/v1/contactos</Code> · GET, POST · <em>requeridos:</em> nombre, email</li>
          <li><Code>/api/v1/contactos/{`{id}`}</Code> · GET, PATCH, DELETE</li>
          <li><Code>/api/v1/empresas</Code> · GET, POST · <em>requeridos:</em> nombre</li>
          <li><Code>/api/v1/empresas/{`{id}`}</Code> · GET, PATCH, DELETE</li>
          <li><Code>/api/v1/oportunidades</Code> · GET, POST · <em>requeridos:</em> nombre, contacto_id, empresa_id</li>
          <li><Code>/api/v1/oportunidades/{`{id}`}</Code> · GET, PATCH, DELETE (soft-delete 30 días)</li>
          <li><Code>/api/v1/productos</Code> · GET, POST · <em>requeridos:</em> nombre</li>
          <li><Code>/api/v1/productos/{`{id}`}</Code> · GET, PATCH, DELETE</li>
        </ul>
      </Section>

      <Section title="Crear un contacto">
        <Pre>{`curl -X POST https://tu-agencia.turistea.app/api/v1/contactos \\
  -H "Authorization: Bearer crm_xxxx" \\
  -H "Content-Type: application/json" \\
  -d '{ "nombre": "Ana Pérez", "email": "ana@ejemplo.com", "telefono": "+54 11 5555 1234" }'`}</Pre>
        <p className="text-xs text-gray-500">Si no enviás <Code>empresa_id</Code>, el contacto queda atado a una empresa especial &quot;API&quot;.</p>
      </Section>

      <Section title="Crear una oportunidad">
        <Pre>{`curl -X POST https://tu-agencia.turistea.app/api/v1/oportunidades \\
  -H "Authorization: Bearer crm_xxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "nombre": "Paquete Europa 12d",
    "contacto_id": "...uuid...",
    "empresa_id": "...uuid...",
    "valor": 4500,
    "moneda": "USD"
  }'`}</Pre>
      </Section>

      <Section title="Respuesta estándar">
        <Pre>{`200/201 OK
{
  "data": { ... },
  "uso": { "usados": 124, "limite": 10000 }
}

202 ACCEPTED  (cuando supera el límite mensual)
{
  "data": { "id": "...", "en_lista_espera": true },
  "mensaje": "Tu cuenta excedió el límite mensual…",
  "uso": { "usados": 10001, "limite": 10000 }
}

401 unauthorized   400 invalid json / missing fields   404 not found`}</Pre>
      </Section>

      <Section title="Lista de espera y plan">
        <p>El límite mensual se reinicia el día 1 de cada mes. Mientras el contador supere el límite, todos los nuevos
        contactos y oportunidades entrantes se marcan con el estado <Code>en_espera</Code> (columna presente en cada tabla,
        no es una tabla separada) sin perderse. Cuando subís de plan o pasa el mes, podés correr el job manual de re-ingreso
        desde Ajustes → Plan.</p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="mb-2 text-sm font-bold uppercase text-gray-500">{title}</h2>
      <div className="space-y-2 text-sm text-gray-700">{children}</div>
    </section>
  );
}
function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{children}</code>;
}
function Pre({ children }: { children: React.ReactNode }) {
  return <pre className="overflow-x-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">{children}</pre>;
}
