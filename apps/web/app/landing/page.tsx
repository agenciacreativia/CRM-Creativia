import { permanentRedirect } from "next/navigation";

// La landing ahora vive en la raíz "/".
// Esta ruta queda como 308 permanent redirect para preservar SEO y
// links viejos que aún apunten a /landing.
export default function LegacyLanding() {
  permanentRedirect("/");
}
