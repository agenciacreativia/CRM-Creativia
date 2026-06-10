import "server-only";
import crypto from "node:crypto";

/**
 * Cifrado simétrico AES-256-GCM para secretos en reposo (tokens OAuth de
 * Google). La clave sale de la env var `TOKEN_ENCRYPTION_KEY` (32 bytes en
 * hex o base64, o cualquier string que se deriva con SHA-256).
 *
 * RETRO-COMPATIBLE: si no hay key configurada, encryptToken devuelve el texto
 * plano tal cual y decryptToken lo lee tal cual. Los tokens cifrados llevan el
 * prefijo `enc:v1:`, así que distinguimos plano de cifrado sin migración. Esto
 * permite activar el cifrado sin romper las conexiones existentes: los tokens
 * viejos siguen leyéndose en plano y se re-cifran la próxima vez que se guardan.
 */

const PREFIX = "enc:v1:";

function getKey(): Buffer | null {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) return null;
  // Aceptamos hex (64 chars), base64, o derivamos con SHA-256 de cualquier string.
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, "hex");
  try {
    const b = Buffer.from(raw, "base64");
    if (b.length === 32) return b;
  } catch {
    /* no era base64 válido */
  }
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptToken(plain: string | null | undefined): string | null {
  if (plain == null) return null;
  const key = getKey();
  if (!key) return plain; // sin key → plano (compat)
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decryptToken(stored: string | null | undefined): string | null {
  if (stored == null) return null;
  if (!stored.startsWith(PREFIX)) return stored; // token viejo en plano
  const key = getKey();
  if (!key) {
    // Hay datos cifrados pero perdimos la key — no podemos descifrar.
    throw new Error("TOKEN_ENCRYPTION_KEY ausente: no se puede descifrar el token almacenado.");
  }
  const [, , ivB64, tagB64, dataB64] = stored.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
