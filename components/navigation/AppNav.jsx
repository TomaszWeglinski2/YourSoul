"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchUnreadConversationCount } from "@/lib/conversationData";

export const APP_PANELS = [
  { href: "/wyrocznia", label: "Wyrocznia", match: "/wyrocznia" },
  { href: "/konstelacja", label: "Konstelacja", match: "/konstelacja" },
  { href: "/rozmowy", label: "Rozmowy", match: "/rozmowy" },
  { href: "/zielnik", label: "Zielnik", match: "/zielnik" },
  { href: "/moje-zapisy", label: "Moje zapisy", match: "/moje-zapisy" },
];

export function isAppPanelPath(pathname) {
  if (pathname.startsWith("/rozmowa/")) {
    return true;
  }
  return APP_PANELS.some((panel) => pathname === panel.match);
}

export function AppNav() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (loading || !user) {
      setUnread(0);
      return;
    }

    let cancelled = false;
    void fetchUnreadConversationCount().then((result) => {
      if (!cancelled && result.ok) {
        setUnread(result.count ?? 0);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loading, user, pathname]);

  return (
    <nav className="appnav" aria-label="Panele aplikacji">
      {APP_PANELS.map((panel) => {
        const active =
          pathname === panel.match || pathname.startsWith(`${panel.match}/`);
        const showBadge = panel.href === "/rozmowy" && unread > 0;

        return (
          <Link
            key={panel.href}
            href={panel.href}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            {panel.label}
            {showBadge ? (
              <span className="appnav__badge" aria-label={`${unread} nowych`}>
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
