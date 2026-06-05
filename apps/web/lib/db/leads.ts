import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";

export type LeadInput = {
  nombre: string;
  email: string;
  telefono?: string | null;
  empresa?: string | null;
  mensaje?: string | null;
};

/**
 * Create a lead from a public web form (no auth). Resolves the tenant by
 * subdomain, finds/creates the company, then creates a contact + opportunity.
 * The plan-cap trigger applies automatically (over-cap rows go to the waitlist).
 */
export async function crearLeadPublico(subdominio: string, input: LeadInput): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminSupabase();

  const { data: tenant } = await admin
    .from("tenant")
    .select("id, estado")
    .eq("subdominio", subdominio)
    .maybeSingle();
  if (!tenant || tenant.estado !== "activo") return { ok: false, error: "Agencia no encontrada" };
  const tid = tenant.id as string;

  // Company: reuse if matching, else create (default bucket "Leads web").
  const empName = input.empresa?.trim() || "Leads web";
  let empresaId: string | null = null;
  const { data: emp } = await admin.from("empresa").select("id").eq("tenant_id", tid).ilike("nombre", empName).maybeSingle();
  if (emp) empresaId = emp.id as string;
  else {
    const { data: created, error } = await admin
      .from("empresa")
      .insert({ tenant_id: tid, nombre: empName, estado_empresa: "prospecto", origen: "web" })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    empresaId = created.id as string;
  }

  // Contact
  // contacto.origen no admite 'web' (empresa/linkedin/cold_call/evento/otro);
  // el origen web queda marcado en la empresa y en el nombre de la oportunidad.
  const { data: cont, error: cErr } = await admin
    .from("contacto")
    .insert({ tenant_id: tid, empresa_id: empresaId, nombre: input.nombre, email: input.email, telefono: input.telefono ?? null })
    .select("id")
    .single();
  if (cErr) return { ok: false, error: cErr.message };

  // Opportunity in the tenant's first pipeline / first stage.
  const { data: pipe } = await admin.from("pipeline").select("id").eq("tenant_id", tid).order("creado_en", { ascending: true }).limit(1).maybeSingle();
  if (pipe) {
    const { data: etapa } = await admin.from("etapa_pipeline").select("id").eq("pipeline_id", pipe.id).order("orden", { ascending: true }).limit(1).maybeSingle();
    if (etapa) {
      await admin.from("oportunidad").insert({
        tenant_id: tid,
        nombre: `Lead web: ${input.nombre}`,
        empresa_id: empresaId,
        contacto_id: cont.id,
        pipeline_id: pipe.id,
        etapa_id: etapa.id,
        estado: "activo",
        moneda: "USD",
        descripcion: input.mensaje ?? null,
      });
    }
  }

  return { ok: true };
}
