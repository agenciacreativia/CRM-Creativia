import "server-only";
import { lookup } from "node:dns/promises";
import net from "node:net";

/**
 * Defensa anti-SSRF para URLs configuradas por el usuario (webhooks salientes).
 *
 * Bloquea destinos que apunten a la red interna del server: loopback, rangos
 * privados RFC1918, link-local (incluido el endpoint de metadata de la nube
 * 169.254.169.254 que filtra credenciales IAM), y CGNAT.
 *
 * Hace DOS chequeos:
 *  1. validarUrlWebhook(): valida scheme + formato. Se usa al guardar.
 *  2. resolverYVerificarIp(): resuelve el hostname y verifica que NINGUNA IP
 *     resuelta caiga en un rango bloqueado. Se usa justo antes del fetch para
 *     mitigar DNS rebinding (un hostname que resuelve público al guardar pero
 *     privado al disparar).
 */

/** ¿La IP (v4 o v6) está en un rango interno/privado que no debe ser alcanzable? */
export function esIpBloqueada(ip: string): boolean {
  const tipo = net.isIP(ip);
  if (tipo === 4) {
    const o = ip.split(".").map(Number);
    if (o.length !== 4 || o.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    const [a, b] = o;
    if (a === 0) return true;                       // 0.0.0.0/8
    if (a === 10) return true;                       // 10.0.0.0/8 privado
    if (a === 127) return true;                      // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true;         // 169.254.0.0/16 link-local + metadata cloud
    if (a === 172 && b >= 16 && b <= 31) return true;// 172.16.0.0/12 privado
    if (a === 192 && b === 168) return true;         // 192.168.0.0/16 privado
    if (a === 100 && b >= 64 && b <= 127) return true;// 100.64.0.0/10 CGNAT
    if (a >= 224) return true;                        // multicast / reservado
    return false;
  }
  if (tipo === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true;        // loopback / unspecified
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7 ULA
    if (lower.startsWith("fe80")) return true;                 // link-local
    // IPv4-mapped (::ffff:a.b.c.d) → validar la parte v4
    const m = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (m) return esIpBloqueada(m[1]);
    return false;
  }
  return true; // no es IP válida → bloquear por las dudas
}

/** Valida scheme + formato al guardar. Lanza Error con mensaje claro si falla. */
export function validarUrlWebhook(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("La URL del webhook no es válida.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("El webhook solo admite URLs http(s).");
  }
  // Si el host ya es una IP literal, validarla directo.
  const host = parsed.hostname.replace(/^\[|\]$/g, ""); // quitar brackets IPv6
  if (net.isIP(host) && esIpBloqueada(host)) {
    throw new Error("La URL apunta a una dirección de red interna no permitida.");
  }
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new Error("La URL apunta a un host interno no permitido.");
  }
  return parsed;
}

/**
 * Resuelve el hostname y verifica que todas las IPs sean públicas.
 * Devuelve true si es seguro disparar el fetch. Best-effort: en caso de error
 * de DNS devuelve false (no disparamos).
 */
export async function urlWebhookEsSegura(url: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = validarUrlWebhook(url);
  } catch {
    return false;
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) return !esIpBloqueada(host);
  try {
    const resultados = await lookup(host, { all: true });
    if (resultados.length === 0) return false;
    return resultados.every((r) => !esIpBloqueada(r.address));
  } catch {
    return false;
  }
}
