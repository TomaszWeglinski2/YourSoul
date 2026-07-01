"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchOracleDrawStatus } from "@/lib/thresholdData";
import { fetchUnreadConversationCount } from "@/lib/conversationData";
import { formatOracleNavBadge } from "@/lib/oracleLimits";

export const APP_PANELS = [
  { href: "/", label: "Próg", match: "/" },
  { href: "/wyrocznia", label: "Wyrocznia", match: "/wyrocznia" },
  { href: "/konstelacja", label: "Konstelacja", match: "/konstelacja" },
  { href: "/rozmowy", label: "Rozmowy", match: "/rozmowy" },
  { href: "/zielnik", label: "Zielnik", match: "/zielnik" },
  { href: "/pracownia", label: "Pracownia", match: "/pracownia" },
  { href: "/ludzie", label: "Spotkania", match: "/ludzie" },
  { href: "/moje-zapisy", label: "Moje zapisy", match: "/moje-zapisy" },
];

export function isPanelActive(pathname, match) {
  if (match === "/") {
    return pathname === "/";
  }
  return pathname === match || pathname.startsWith(`${match}/`);
}

export function isAppPanelPath(pathname) {
  if (pathname.startsWith("/rozmowa/")) {
    return true;
  }
  return APP_PANELS.some((panel) => isPanelActive(pathname, panel.match));
}

export function AppNav() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [unread, setUnread] = useState(0);
  const [oracleRemaining, setOracleRemaining] = useState(null);

  useEffect(() => {
    if (loading || !user) {
      setUnread(0);
      setOracleRemaining(null);
      return;
    }

    let cancelled = false;

    void fetchUnreadConversationCount().then((result) => {
      if (!cancelled && result.ok) {
        setUnread(result.count ?? 0);
      }
    });

    void fetchOracleDrawStatus().then((result) => {
      if (!cancelled && result.ok) {
        setOracleRemaining(Number(result.status?.remaining ?? 0));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loading, user, pathname]);

  return (
    <nav className="appnav" aria-label="Panele aplikacji">
      {APP_PANELS.map((panel) => {
        const active = isPanelActive(pathname, panel.match);
        const showUnreadBadge = panel.href === "/rozmowy" && unread > 0;
        const isOracle = panel.href === "/wyrocznia";
        const oracleBadge =
          isOracle && oracleRemaining !== null
            ? formatOracleNavBadge(oracleRemaining)
            : null;

        return (
          <Link
            key={panel.href}
            href={panel.href}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            {isOracle && oracleBadge ? (
              <span className="appnav__label-with-oracle">
                <span>Wyrocznia</span>
                <span
                  className={`appnav__oracle ${
                    oracleRemaining === 0 ? "appnav__oracle--muted" : ""
                  }`}
                >
                  {oracleBadge}
                </span>
              </span>
            ) : (
              panel.label
            )}
            {showUnreadBadge ? (
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
