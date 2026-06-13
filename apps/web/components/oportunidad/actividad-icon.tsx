import { Phone, Mail, MessageCircle, Calendar, Circle, type LucideIcon } from "lucide-react";

/**
 * Ícono (SVG Lucide) por tipo de actividad. Reemplaza los emojis que se usaban
 * como glifos (📞/✉️/💬/📅) — consistentes entre plataformas y theme-aware.
 * Es presentacional (sin hooks), usable en Server y Client Components.
 */
const MAP: Record<string, LucideIcon> = {
  llamada: Phone,
  email: Mail,
  whatsapp: MessageCircle,
  reunion: Calendar,
  otra: Circle,
};

export function ActividadIcon({ tipo, className = "h-4 w-4" }: { tipo: string; className?: string }) {
  const Icon = MAP[tipo] ?? Circle;
  return <Icon className={className} aria-hidden />;
}
