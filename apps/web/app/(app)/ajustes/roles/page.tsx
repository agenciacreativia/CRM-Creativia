import { redirect } from "next/navigation";

/**
 * Roles y cuentas se combinaron con Usuarios en una sola página (/admin/usuarios
 * → "Usuarios y roles"). Redirigimos para no romper links guardados ni el menú.
 */
export default function RolesRedirect() {
  redirect("/admin/usuarios");
}
