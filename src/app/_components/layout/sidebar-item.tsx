"use client";

import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

type SidebarItemProps = {
  href: string;
  label: string;
  active: boolean;
  collapsed: boolean;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  onNavigate?: () => void;
};

export function SidebarItem({
  href,
  label,
  active,
  collapsed,
  icon: Icon,
  onNavigate,
}: SidebarItemProps) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={[
        "group relative flex min-h-11 items-center rounded-xl text-sm font-medium transition",
        collapsed ? "justify-center px-3" : "gap-3 px-3.5",
        active
          ? "bg-white/12 text-white shadow-sm"
          : "text-slate-300 hover:bg-white/8 hover:text-white",
      ].join(" ")}
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      {!collapsed ? <span className="truncate">{label}</span> : null}

      {collapsed ? (
        <span className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-md bg-slate-950 px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block">
          {label}
        </span>
      ) : null}
    </Link>
  );
}
