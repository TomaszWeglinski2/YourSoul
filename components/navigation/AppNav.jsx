"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const APP_PANELS = [
  { href: "/wyrocznia", label: "Wyrocznia", match: "/wyrocznia" },
  { href: "/konstelacja", label: "Konstelacja", match: "/konstelacja" },
  { href: "/zielnik", label: "Zielnik", match: "/zielnik" },
  { href: "/moje-zapisy", label: "Moje zapisy", match: "/moje-zapisy" },
];

export function isAppPanelPath(pathname) {
  return APP_PANELS.some((panel) => pathname === panel.match);
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="appnav" aria-label="Panele aplikacji">
      {APP_PANELS.map((panel) => {
        const active = pathname === panel.match;
        return (
          <Link
            key={panel.href}
            href={panel.href}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            {panel.label}
          </Link>
        );
      })}
    </nav>
  );
}
