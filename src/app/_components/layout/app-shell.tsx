"use client";

import { useEffect, useState } from "react";

import { Header } from "~/app/_components/layout/header";
import { Sidebar } from "~/app/_components/layout/sidebar";

const STORAGE_KEY = "nomina-sidebar-collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
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
