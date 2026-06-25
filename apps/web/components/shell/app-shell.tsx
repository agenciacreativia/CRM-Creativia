"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  Package,
  Calendar,
  BarChart3,
  Heart,
  Store,
  Ticket,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Settings,
  Bell,
  Mail,
  Eye,
  Menu as MenuIcon,
  X,
  type LucideIcon,
} from "lucide-react";
import { verComoAgenciaAction } from "@/app/(app)/ajustes/agencias/actions";
import { cn } from "@/lib/utils";
import { SearchModal } from "@/components/search/search-modal";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { CreateModals, type CreateEntity } from "@/components/create/create-modals";
import { can, type Permisos, type ModuleKey } from "@/lib/permissions";
import type { Notificacion } from "@/lib/db/notificaciones";

type ShellUser = {
  id: string;
  nombre: string;
  email: string;
  rol: "admin" | "asesor" | null;
};

type Props = {
  user: ShellUser;
  tenant: { nombre_empresa: string };
  permisos?: Permisos;
  esAdmin?: boolean;
  tools?: { roles_permisos: boolean; importar_datos: boolean };
  notificaciones?: Notificacion[];
  agencias?: { id: string; nombre: string }[];
  children: React.ReactNode;
};

const SIDEBAR_KEY = "crm.sidebar.collapsed";

const ROW_CLS =
  "flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors";

export function AppShell({ user, tenant, permisos, esAdmin, tools, notificaciones = [], agencias = [], children }: Props) {
  const toolRoles = tools?.roles_permisos ?? true;
  const [verComoOpen, setVerComoOpen] = useState(false);
  const [verComoBusy, setVerComoBusy] = useState<string | null>(null);
  const [verComoError, setVerComoError] = useState<string | null>(null);

  async function verComoAgencia(id: string) {
    setVerComoError(null);
    setVerComoBusy(id);
    const res = await verComoAgenciaAction(id);
    setVerComoBusy(null);
    if (!res.ok || !res.url) setVerComoError(res.error ?? "Error");
    else window.location.href = res.url;
  }
  const pathname = usePathname();
  const { t } = useTranslation();

  const [collapsed, setCollapsed] = useState(false);
  // Mobile drawer (<md). El sidebar normal está oculto bajo md y se reemplaza
  // por este drawer overlay que se abre desde el hamburguesa del topbar.
  const [mobileOpen, setMobileOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [createEntity, setCreateEntity] = useState<CreateEntity>(null);

  useEffect(() => {
    if (window.localStorage.getItem(SIDEBAR_KEY) === "1") setCollapsed(true);
  }, []);

  // Close menus + mobile drawer on route change
  useEffect(() => {
    setAddOpen(false);
    setUserOpen(false);
    setNotifOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  // Bloquear scroll del body cuando el drawer móvil está abierto, para que el
  // contenido detrás no se mueva con scroll inercial en iOS.
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  // En el drawer móvil siempre mostramos labels — el "collapsed" (icons-only)
  // solo aplica al sidebar lateral md+. Sin esto, abrir el drawer en celu
  // mostraría solo iconos si el user había colapsado en escritorio.
  const sidebarCollapsed = collapsed && !mobileOpen;

  // Daily CRM navigation — lives in the left rail. Each item maps to a
  // permission module; hidden when the role lacks "ver" (admins see all).
  const isAdmin = esAdmin || user.rol === "admin";
  const allNavItems: { href: string; label: string; icon: LucideIcon; mod: ModuleKey }[] = [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard, mod: "dashboard" },
    { href: "/empresas", label: t("nav.empresas"), icon: Building2, mod: "empresas" },
    { href: "/contactos", label: t("nav.contactos"), icon: Users, mod: "contactos" },
    { href: "/oportunidades", label: t("nav.oportunidades"), icon: Briefcase, mod: "oportunidades" },
    { href: "/productos", label: "Productos", icon: Package, mod: "productos" },
    { href: "/agenda", label: t("nav.agenda"), icon: Calendar, mod: "agenda" },
    { href: "/fidelizacion", label: "Fidelización", icon: Heart, mod: "contactos" },
    { href: "/campanias", label: "Campañas", icon: Mail, mod: "contactos" },
    { href: "/reportes", label: "Reportes", icon: BarChart3, mod: "dashboard" },
  ];
  const navItems = allNavItems.filter((i) => can(permisos, i.mod, "ver", isAdmin));
  // Catálogo mayorista de Turistea: visible para todas las agencias (no es un módulo de permisos).
  const extraNav: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/catalogo", label: "Catálogo Turistea", icon: Store },
    { href: "/reservas", label: "Reservas", icon: Ticket },
  ];

  // Quick-add actions for the "+" button — each opens a create modal.
  // Filtered by the role's "crear" permission per module (admins see all).
  const allAddItems: { entity: Exclude<CreateEntity, null>; label: string; icon: LucideIcon; mod: ModuleKey }[] = [
    { entity: "oportunidad", label: "Nueva oportunidad", icon: Briefcase, mod: "oportunidades" },
    { entity: "contacto", label: "Nuevo contacto", icon: Users, mod: "contactos" },
    { entity: "empresa", label: "Nueva empresa", icon: Building2, mod: "empresas" },
  ];
  const addItems = allAddItems.filter((i) => can(permisos, i.mod, "crear", isAdmin));

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const currentTitle =
    [...navItems, ...extraNav].find((i) => isActive(i.href))?.label ??
    (pathname.startsWith("/admin") ? t("nav.admin") : "");

  return (
    <div className="flex min-h-screen">
      {/* Backdrop del drawer móvil — fade-in suave + tap para cerrar. */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity [transition-duration:240ms] md:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />

      {/* ---------------- LEFT SIDEBAR ----------------
          - md+: sticky lateral (60px collapsed, 240px expanded)
          - <md: drawer overlay slide-in desde la izquierda. La transición
            usa cubic-bezier suave (motion EASE) en lugar del default linear
            para que el drawer se sienta natural al abrir/cerrar. */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col surface-sidebar",
          "transition-[transform,width] [transition-duration:240ms] motion-reduce:transition-none",
          "md:sticky md:top-0 md:translate-x-0",
          collapsed ? "md:w-16" : "md:w-60",
          // Mobile width + slide
          mobileOpen ? "w-64 translate-x-0 shadow-2xl" : "w-64 -translate-x-full md:translate-x-0",
        )}
        style={{ transitionTimingFunction: "cubic-bezier(0.21, 0.47, 0.32, 0.98)" }}
      >
        {/* Brand + collapse toggle */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-white/5",
            sidebarCollapsed ? "justify-center px-0" : "justify-between px-4",
          )}
        >
          {!sidebarCollapsed && (
            <Link href="/dashboard" aria-label="Turistea CRM" className="flex min-w-0 items-center">
              <Image
                src="/turistea-crm-light.svg"
                alt="Turistea CRM"
                width={1677}
                height={451}
                priority
                className="h-11 w-auto"
              />
            </Link>
          )}
          {/* En mobile el botón de cierre del drawer; en desktop, el collapse. */}
          <button
            type="button"
            onClick={() => (mobileOpen ? setMobileOpen(false) : toggleCollapsed())}
            className="flex h-9 w-9 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label={mobileOpen ? "Cerrar menú" : sidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
            title={mobileOpen ? "Cerrar" : sidebarCollapsed ? "Expandir" : "Colapsar"}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {[...navItems, ...extraNav].map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={sidebarCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md py-2.5 text-sm font-medium transition-colors",
                  sidebarCollapsed ? "justify-center px-0" : "px-3",
                  active
                    ? "nav-active"
                    : "text-white/70 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* "+ Crear" CTA orange (anchored above footer) */}
        {!sidebarCollapsed && addItems.length > 0 && (
          <div className="px-3 pb-2">
            <button
              type="button"
              onClick={() => { setAddOpen((o) => !o); setUserOpen(false); }}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-orange px-3 py-2.5 text-sm font-semibold text-white shadow-lift transition-colors hover:brightness-110"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} /> Crear
            </button>
          </div>
        )}

        {/* Footer */}
        {!sidebarCollapsed && (
          <div className="border-t border-white/5 px-4 py-3 text-xs text-white/40">
            <a href="https://agenciacreativia.com/" target="_blank" rel="noopener noreferrer" className="block hover:text-brand-green">
              Agencia Creativia
            </a>
            <span className="block text-white/30">v1.0.0 · lanzamiento</span>
          </div>
        )}
      </aside>

      {/* ---------------- RIGHT COLUMN ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top strip: search + add + user */}
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
          <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-6">
            {/* Hamburguesa para abrir el sidebar en mobile. Oculto md+. */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 md:hidden"
            >
              <MenuIcon className="h-5 w-5" />
            </button>

            {/* Section title (left) — más chico en mobile para dejar lugar a la búsqueda. */}
            <h1 className="min-w-0 truncate text-base font-bold text-gray-900 sm:text-lg">{currentTitle}</h1>

            {/* Search + add (centered group) — mx-auto en md+, alineado a la derecha en mobile */}
            <div className="ml-auto flex items-center gap-1 sm:gap-2 md:mx-auto md:ml-auto">
              <SearchModal />

              {/* + Add button — icon only (hidden if the role can't create anything) */}
              {(addItems.length > 0 || isAdmin) && (
              <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setAddOpen((o) => !o);
                  setUserOpen(false);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-orange text-white transition-colors hover:brightness-110 sm:h-9 sm:w-9"
                aria-haspopup="menu"
                aria-expanded={addOpen}
                aria-label="Agregar"
                title="Agregar"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              </button>
              {addOpen && (
                <Menu onClose={() => setAddOpen(false)} align="left">
                  <p className="px-3 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Crear nuevo
                  </p>
                  {addItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setAddOpen(false);
                          setCreateEntity(item.entity);
                        }}
                        className={ROW_CLS + " w-full text-left"}
                      >
                        <Icon className="h-4 w-4 text-gray-500" />
                        {item.label}
                      </button>
                    );
                  })}
                </Menu>
              )}
              </div>
              )}
            </div>

            {/* Notifications bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => { setNotifOpen((o) => !o); setUserOpen(false); setAddOpen(false); }}
                className="relative flex h-10 w-10 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 sm:h-9 sm:w-9"
                aria-haspopup="menu"
                aria-expanded={notifOpen}
                aria-label="Notificaciones"
                title="Notificaciones"
              >
                <Bell className="h-5 w-5" />
                {notificaciones.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-danger px-1 text-[11px] font-bold text-white">
                    {notificaciones.length > 9 ? "9+" : notificaciones.length}
                  </span>
                )}
              </button>
              {notifOpen && (
                <Menu onClose={() => setNotifOpen(false)} align="right">
                  <div className="flex items-center justify-between px-3 py-2">
                    <p className="text-sm font-semibold text-gray-900">Notificaciones</p>
                    <span className="text-xs text-gray-400">{notificaciones.length}</span>
                  </div>
                  <div className="my-1 border-t border-gray-100" />
                  {notificaciones.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-gray-400">Estás al día</p>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {notificaciones.map((n) => (
                        <Link
                          key={n.id}
                          href={n.href}
                          className="flex items-start gap-2.5 px-3 py-2 hover:bg-gray-50"
                          onClick={() => setNotifOpen(false)}
                        >
                          <span
                            className={cn(
                              "mt-1 h-2 w-2 shrink-0 rounded-full",
                              n.tipo === "vencida" ? "bg-status-danger" : "bg-yellow-400",
                            )}
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-gray-800">{n.titulo}</span>
                            <span className="block truncate text-xs text-gray-500">{n.descripcion}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </Menu>
              )}
            </div>

            {/* User menu (right) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setUserOpen((o) => !o);
                  setAddOpen(false);
                }}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                aria-haspopup="menu"
                aria-expanded={userOpen}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary text-xs font-semibold text-white">
                  {initials(user.nombre)}
                </span>
                <span className="hidden max-w-[10rem] truncate text-left lg:block">
                  {user.nombre}
                </span>
                <ChevronDown className="hidden h-4 w-4 text-gray-400 lg:block" />
              </button>

              {userOpen && (
                <Menu onClose={() => setUserOpen(false)} align="right">
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-medium text-gray-900">{user.nombre}</p>
                    <p className="truncate text-xs text-gray-500">{user.email}</p>
                    {user.rol && (
                      <span className="mt-1 inline-block text-xs uppercase text-gray-400">
                        {user.rol} · {tenant.nombre_empresa}
                      </span>
                    )}
                  </div>

                  <div className="my-1 border-t border-gray-100" />
                  <Link href="/ajustes" className={ROW_CLS}>
                    <Settings className="h-4 w-4 text-gray-500" />
                    Ajustes
                  </Link>

                  {user.rol === "admin" && toolRoles && (
                    <>
                      <div className="my-1 border-t border-gray-100" />
                      <Link href="/ajustes/roles" className={ROW_CLS}>
                        <ShieldCheck className="h-4 w-4 text-gray-500" />
                        Roles y cuentas
                      </Link>
                    </>
                  )}

                  {agencias.length > 0 && (
                    <>
                      <div className="my-1 border-t border-gray-100" />
                      <button
                        type="button"
                        onClick={() => setVerComoOpen((o) => !o)}
                        className={ROW_CLS + " w-full justify-between"}
                      >
                        <span className="flex items-center gap-2.5">
                          <Eye className="h-4 w-4 text-gray-500" />
                          Ver como agencia
                        </span>
                        <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", verComoOpen && "rotate-180")} />
                      </button>
                      {verComoOpen && (
                        <div className="max-h-56 overflow-y-auto border-t border-gray-50 bg-gray-50/60 py-1">
                          {verComoError && <p className="px-3 py-1 text-xs text-status-danger">{verComoError}</p>}
                          {agencias.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => verComoAgencia(a.id)}
                              disabled={verComoBusy === a.id}
                              className="flex w-full items-center justify-between px-3 py-1.5 pl-9 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                            >
                              <span className="truncate">{a.nombre}</span>
                              {verComoBusy === a.id && <span className="text-xs text-gray-400">entrando…</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <div className="my-1 border-t border-gray-100" />
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-gray-600">Idioma / Tema</span>
                    <div className="flex items-center gap-2">
                      <LanguageSwitcher />
                      <ThemeToggle />
                    </div>
                  </div>

                  <div className="my-1 border-t border-gray-100" />
                  <div className="px-1 py-1">
                    <SignOutButton />
                  </div>
                </Menu>
              )}
            </div>
          </div>
        </header>

        {/* Full-width content. Padding x reducido en mobile para aprovechar
            mejor el ancho útil de pantalla. pb extra en mobile para no quedar
            tapado por bulk action bars o por la barra de navegación nativa. */}
        <main className="w-full flex-1 px-3 pb-24 pt-4 sm:px-6 sm:py-6 sm:pb-6 lg:px-8">{children}</main>
      </div>

      {/* Create-record modals (opened from the "+" menu) */}
      <CreateModals
        entity={createEntity}
        onClose={() => setCreateEntity(null)}
        currentUserId={user.id}
        rol={user.rol}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small dropdown menu with click-outside backdrop                    */
/* ------------------------------------------------------------------ */

function Menu({
  children,
  onClose,
  align,
}: {
  children: React.ReactNode;
  onClose: () => void;
  align: "left" | "right";
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden />
      <div
        role="menu"
        className={cn(
          "surface-white absolute top-full z-50 mt-2 w-60 rounded-lg border border-gray-200 bg-white py-1 shadow-2xl",
          align === "right" ? "right-0" : "left-0",
        )}
      >
        {children}
      </div>
    </>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
