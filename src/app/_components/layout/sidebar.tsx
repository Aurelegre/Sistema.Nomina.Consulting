"use client";

import { usePathname } from "next/navigation";

import {
  AbsenceIcon,
  AssociationIcon,
  BuildingIcon,
  CalendarIcon,
  ChevronIcon,
  DashboardIcon,
  LogoutIcon,
  PayrollIcon,
  ReportIcon,
  SettingsIcon,
  UsersIcon,
} from "~/app/_components/layout/sidebar-icons";
import { SidebarItem } from "~/app/_components/layout/sidebar-item";

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
};

const navigation = [
  { href: "/", label: "Dashboard", icon: DashboardIcon },
  { href: "/empleados", label: "Empleados", icon: UsersIcon },
  { href: "/departamentos", label: "Departamentos", icon: BuildingIcon },
  { href: "/periodos", label: "Períodos", icon: CalendarIcon },
  { href: "/nomina", label: "Nómina", icon: PayrollIcon },
  { href: "/ausencias", label: "Ausencias", icon: AbsenceIcon },
  { href: "/asociacion", label: "Asociación", icon: AssociationIcon },
  { href: "/reportes", label: "Reportes", icon: ReportIcon },
  { href: "/usuarios", label: "Usuarios", icon: UsersIcon },
] as const;

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {mobileOpen ? (
        <button
          aria-label="Cerrar menú lateral"
          className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
          type="button"
          onClick={onCloseMobile}
        />
      ) : null}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-[#11122f] text-white shadow-xl transition-[width,transform] duration-300",
          collapsed ? "lg:w-20" : "lg:w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "w-64 lg:translate-x-0",
        ].join(" ")}
      >
        <div
          className={[
            "flex h-20 items-center border-b border-white/10",
            collapsed ? "justify-center px-3" : "gap-3 px-5",
          ].join(" ")}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-[#11122f]">
            CS
          </div>

          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-wide">
                Consulting, S.A.
              </p>
              <p className="truncate text-xs text-slate-400">
                Sistema de Nómina
              </p>
            </div>
          ) : null}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {navigation.map((item) => (
            <SidebarItem
              key={item.href}
              active={isActive(item.href)}
              collapsed={collapsed}
              href={item.href}
              icon={item.icon}
              label={item.label}
              onNavigate={onCloseMobile}
            />
          ))}
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <SidebarItem
            active={isActive("/configuracion")}
            collapsed={collapsed}
            href="/configuracion"
            icon={SettingsIcon}
            label="Configuración"
            onNavigate={onCloseMobile}
          />

          <button
            className={[
              "mt-1 flex min-h-11 w-full items-center rounded-xl text-sm font-medium text-slate-400 transition",
              collapsed ? "justify-center px-3" : "gap-3 px-3.5",
            ].join(" ")}
            disabled
            title={
              collapsed
                ? "Cerrar sesión"
                : "Disponible al implementar autenticación"
            }
            type="button"
          >
            <LogoutIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
            {!collapsed ? <span>Cerrar sesión</span> : null}
          </button>

          <button
            aria-label={collapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
            className={[
              "mt-3 hidden min-h-10 w-full items-center rounded-xl border border-white/10 text-xs font-medium text-slate-300 transition hover:bg-white/8 hover:text-white lg:flex",
              collapsed ? "justify-center px-3" : "gap-3 px-3.5",
            ].join(" ")}
            type="button"
            onClick={onToggleCollapsed}
          >
            <ChevronIcon
              className={[
                "h-4 w-4 transition-transform",
                collapsed ? "rotate-180" : "",
              ].join(" ")}
              aria-hidden="true"
            />
            {!collapsed ? <span>Contraer menú</span> : null}
          </button>
        </div>
      </aside>
    </>
  );
}
