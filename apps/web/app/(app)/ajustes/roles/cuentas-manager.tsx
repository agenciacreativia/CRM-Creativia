"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Mail, Link2, X, Check, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { setUsuarioRolAction, createInvitacionAction, cancelInvitacionAction } from "./actions";

type RolOption = { id: string; nombre: string; es_admin: boolean };
type Usuario = { id: string; nombre: string; email: string; rol_id: string | null; activo: boolean };
type Invitacion = {
  id: string;
  email: string;
  nombre: string | null;
  rol_nombre: string | null;
  estado: string;
  creado_en: string;
  expira_en: string;
  token: string;
};

export function CuentasManager({
  usuarios,
  roles,
  invitaciones,
  currentUserId,
  inviteBaseUrl,
}: {
  usuarios: Usuario[];
  roles: RolOption[];
  invitaciones: Invitacion[];
  currentUserId: string;
  inviteBaseUrl: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Invite form
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [rolId, setRolId] = useState(roles[0]?.id ?? "");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ link: string; emailed: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const pendientes = invitaciones.filter((i) => i.estado === "pendiente");

  async function changeRol(usuarioId: string, newRolId: string) {
    setError(null);
    setSavingId(usuarioId);
    const res = await setUsuarioRolAction(usuarioId, newRolId);
    setSavingId(null);
    if (!res.ok) setError(res.error ?? "Error");
    else router.refresh();
  }

  async function invite() {
    setError(null);
    setInviteResult(null);
    if (!email.trim() || !rolId) {
      setError("Completá correo y rol.");
      return;
    }
    setInviting(true);
    const res = await createInvitacionAction({ email, nombre: nombre || null, rol_id: rolId });
    setInviting(false);
    if (!res.ok) {
      setError(res.error ?? "Error");
      return;
    }
    setInviteResult({ link: res.link ?? "", emailed: !!res.emailed });
    setEmail("");
    setNombre("");
    router.refresh();
  }

  async function cancelInvite(id: string) {
    setError(null);
    const res = await cancelInvitacionAction(id);
    if (!res.ok) setError(res.error ?? "Error");
    else router.refresh();
  }

  function copyLink(link: string) {
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

      {/* Existing users */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase text-gray-400">Usuarios ({usuarios.length})</h3>
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {usuarios.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {u.nombre}
                  {u.id === currentUserId && <span className="ml-2 text-xs text-gray-400">(vos)</span>}
                  {!u.activo && <Badge variant="danger" className="ml-2">desactivado</Badge>}
                </p>
                <p className="truncate text-xs text-gray-500">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={u.rol_id ?? ""}
                  onChange={(e) => changeRol(u.id, e.target.value)}
                  disabled={savingId === u.id}
                  className="w-44"
                >
                  {!u.rol_id && <option value="">— Sin rol —</option>}
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </Select>
                {savingId === u.id && <span className="text-xs text-gray-400">guardando…</span>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Pending invitations */}
      {pendientes.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase text-gray-400">
            Invitaciones pendientes ({pendientes.length})
          </h3>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {pendientes.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{i.email}</p>
                  <p className="text-xs text-gray-500">
                    {i.rol_nombre ?? "sin rol"} · vence {new Date(i.expira_en).toLocaleDateString("es")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyLink(`${inviteBaseUrl}?token=${i.token}`)}
                    className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline"
                    title="Copiar enlace"
                  >
                    <Link2 className="h-3.5 w-3.5" /> Copiar enlace
                  </button>
                  <button
                    onClick={() => cancelInvite(i.id)}
                    className="text-gray-400 hover:text-status-danger"
                    title="Cancelar invitación"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Invite form */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <UserPlus className="h-4 w-4" /> Invitar una cuenta
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Correo">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="persona@empresa.com" />
          </Field>
          <Field label="Nombre (opcional)">
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido" />
          </Field>
          <Field label="Rol">
            <Select value={rolId} onChange={(e) => setRolId(e.target.value)}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-3">
          <Button type="button" onClick={invite} disabled={inviting} className="inline-flex items-center gap-1.5">
            <Mail className="h-4 w-4" /> {inviting ? "Enviando…" : "Enviar invitación"}
          </Button>
        </div>

        {inviteResult && (
          <div className="mt-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm">
            <p className="flex items-center gap-1.5 font-medium text-gray-800">
              <Check className="h-4 w-4 text-green-600" />
              {inviteResult.emailed ? "Invitación enviada por correo." : "Invitación creada."}
            </p>
            <p className="mt-1 text-xs text-gray-600">
              {inviteResult.emailed
                ? "También podés compartir el enlace manualmente:"
                : "No hay Google conectado para enviar el correo — compartí este enlace:"}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="flex-1 truncate rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700">
                {inviteResult.link}
              </code>
              <button
                onClick={() => copyLink(inviteResult.link)}
                className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
              >
                <Copy className="h-3.5 w-3.5" /> {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
