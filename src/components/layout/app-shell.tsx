"use client";

import { useEffect, useState } from "react";

import { Header } from "~/components/layout/header";
import { Sidebar } from "~/components/layout/sidebar";

const STORAGE_KEY = "nomina-sidebar-collapsed";

export function AppShell({
  children,
  permisos,
  empleadoId,
}: {
  children: React.ReactNode;
  permisos: string[];
  empleadoId?: number | null;
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
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
