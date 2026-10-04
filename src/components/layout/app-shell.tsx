"use client";

import { useEffect, useState } from "react";

import { Header } from "~/components/layout/header";
import { Sidebar } from "~/components/layout/sidebar";
import { NotificacionesNomina } from "~/features/nomina/Components/notificacionesNomina";

const STORAGE_KEY = "nomina-sidebar-collapsed";

export function AppShell({
  children,
  permisos,
  empleadoId,
  esJefeDepartamento,
}: {
  children: React.ReactNode;
  permisos: string[];
  empleadoId?: number | null;
  esJefeDepartamento?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored !== null) {
      setCollapsed(stored === "true");
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        esJefeDepartamento={esJefeDepartamento}
        empleadoId={empleadoId}
        permisos={permisos}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleCollapsed={toggleCollapsed}
      />

      <div
        className={[
          "min-h-screen transition-[padding] duration-300",
          collapsed ? "lg:pl-20" : "lg:pl-64",
        ].join(" ")}
      >
        <Header onOpenMobile={() => setMobileOpen(true)} />
        <div className="space-y-4 p-4 sm:p-6 lg:p-8">
          <NotificacionesNomina />
          {children}
        </div>
      </div>
    </div>
  );
}
