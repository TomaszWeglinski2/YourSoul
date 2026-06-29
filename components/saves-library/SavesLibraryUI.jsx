"use client";

import Link from "next/link";
import { useId } from "react";
import {
  AXES,
  authorInitial,
  axisBarStyle,
  formatFullTime,
  formatRelativeTime,
} from "@/lib/savesLibraryUtils";
import { BrassButton } from "@/components/journey/JourneyShell";

export function SavesEmptyState({ icon, title, description }) {
  return (
    <div className="sl-empty">
      <div className="sl-empty-ic" aria-hidden="true">
        {icon}
      </div>
      <p className="sl-empty-title">{title}</p>
      <p className="sl-empty-desc">{description}</p>
    </div>
  );
}

export function AxisBars({ odcisk }) {
  const values = Array.isArray(odcisk) ? odcisk : [];

  return (
    <div className="sl-axes">
      {AXES.map((name, index) => {
        const bar = axisBarStyle(values[index] ?? 0);
        return (
          <div key={name}>
            <div className="sl-axis-label">
              <span className="sl-axis-name">{name}</span>
              <span className={`sl-axis-val${bar.positive ? "" : " neg"}`}>
                {bar.label}
              </span>
            </div>
            <div className="sl-axis-track">
              <div className="sl-axis-zero" />
              <div
                className={`sl-axis-fill ${bar.positive ? "pos" : "neg"}`}
                style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ProfileCard({ profile, displayName }) {
  if (!profile) {
    return (
      <div className="sl-profile">
        <div className="sl-profile-top">
          <span className="sl-profile-kick">Profil · Wrota</span>
        </div>
        <p className="text-sm italic text-mistsoft">
          Brak wiersza w profiles — przejdź Wrota po zalogowaniu.
        </p>
      </div>
    );
  }

  return (
    <div className="sl-profile">
      <div className="sl-profile-top">
        <span className="sl-profile-kick">Profil · Wrota</span>
        <span className="sl-profile-upd" title={formatFullTime(profile.updated_at)}>
          zaktualizowano: {formatRelativeTime(profile.updated_at)}
        </span>
      </div>
      {profile.display_name || displayName ? (
        <p className="mb-3 text-sm text-mist">
          <span className="text-mistsoft">Nazwa: </span>
          {profile.display_name ?? displayName}
        </p>
      ) : null}
      <div className="sl-worlds">
        {profile.worlds?.length ? (
          profile.worlds.map((world) => (
            <span key={world} className="sl-chip">
              {world}
            </span>
          ))
        ) : (
          <span className="text-sm italic text-mistsoft">— brak światów —</span>
        )}
      </div>
      <AxisBars odcisk={profile.odcisk} />
    </div>
  );
}

export function QuoteCard({
  author,
  text,
  createdAt,
  dupCount,
  extra,
}) {
  const dupBadge =
    dupCount && dupCount > 1 ? (
      <span className="sl-dup">zapisany {dupCount}×</span>
    ) : null;

  return (
    <div className="sl-qcard">
      <div className="sl-qmark" aria-hidden="true">
        {authorInitial(author)}
      </div>
      <div className="sl-qbody">
        <p className="sl-qtext">„{text}"</p>
        <div className="sl-qmeta">
          <span className="sl-qmeta-au">{author || "—"}</span>
          <span className="sl-qmeta-sep">·</span>
          <span title={formatFullTime(createdAt)}>{formatRelativeTime(createdAt)}</span>
        </div>
        {extra}
      </div>
      {dupBadge}
    </div>
  );
}

export function MarginCard({ body, quoteText, visibility, createdAt }) {
  const isPublic = visibility === "public";

  return (
    <div className="sl-mcard">
      <div className="sl-mtop">
        <p className="sl-mbody">„{body}"</p>
        <span className={`sl-badge ${isPublic ? "pub" : "prv"}`}>
          {isPublic ? "publiczny" : "prywatny"}
        </span>
      </div>
      {quoteText ? (
        <p className="sl-mquote">
          przy: <i>„{quoteText}"</i>
        </p>
      ) : null}
      {createdAt ? (
        <p className="sl-mtime" title={formatFullTime(createdAt)}>
          {formatRelativeTime(createdAt)}
        </p>
      ) : null}
    </div>
  );
}

export function ResonanceCard({ title, subtitle, createdAt, icon = "✦" }) {
  return (
    <div className="sl-rcard">
      <div className="sl-rcard-ic" aria-hidden="true">
        {icon}
      </div>
      <div>
        <p className="sl-rcard-title">{title}</p>
        {subtitle ? <p className="sl-rcard-sub">{subtitle}</p> : null}
        {createdAt ? (
          <p className="sl-rcard-sub" title={formatFullTime(createdAt)}>
            {formatRelativeTime(createdAt)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function SavesStickyBar({
  search,
  onSearchChange,
  activeTab,
  onTabChange,
  counts,
  tabs,
}) {
  const searchId = useId();

  return (
    <div className="sl-sticky">
      <div className="sl-search">
        <span className="sl-search-ic" aria-hidden="true">
          ⌕
        </span>
        <input
          id={searchId}
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Szukaj po cytacie lub autorze…"
          autoComplete="off"
          aria-label="Szukaj w aktywnej liście"
        />
        {search ? (
          <button
            type="button"
            className="sl-search-clr"
            aria-label="Wyczyść wyszukiwanie"
            onClick={() => {
              onSearchChange("");
              document.getElementById(searchId)?.focus();
            }}
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="sl-tabs" role="tablist" aria-label="Zakładki zapisów">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`sl-tab${activeTab === tab.id ? " on" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
            <span className="sl-tab-cnt">{counts[tab.id] ?? 0}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function KonstelacjaPane({
  items,
  total,
  search,
  sort,
  onSortChange,
  groupByAuthor,
  onGroupToggle,
  dupCounts,
  getItemProps,
  skyLinkHref,
  emptySearch,
  emptyDefault,
}) {
  const countLabel = search ? (
    <>
      Znaleziono <b>{items.length}</b> z {total}
    </>
  ) : (
    <>
      <b>{total}</b> {total === 1 ? "gwiazda" : total >= 2 && total <= 4 ? "gwiazdy" : "gwiazd"}
    </>
  );

  return (
    <section role="tabpanel">
      <div className="sl-toolbar">
        <p className="sl-count">{countLabel}</p>
        <div className="sl-controls">
          {skyLinkHref ? (
            <Link
              href={skyLinkHref}
              className="sl-skylink"
              title="Otwórz konstelację jako niebo — gwiazdy na mapie"
            >
              ✦ otwórz jako niebo
            </Link>
          ) : null}
          <select
            className="sl-select"
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label="Sortowanie konstelacji"
          >
            <option value="new">Najnowsze</option>
            <option value="old">Najstarsze</option>
            <option value="author">Autor A–Z</option>
          </select>
          <button
            type="button"
            className={`sl-toggle${groupByAuthor ? " on" : ""}`}
            aria-pressed={groupByAuthor}
            onClick={onGroupToggle}
          >
            <span className="sl-toggle-dot" aria-hidden="true" />
            grupuj wg autora
          </button>
        </div>
      </div>
      <div className="sl-list">
        {items.length === 0 ? (
          search ? (
            <SavesEmptyState {...emptySearch} />
          ) : (
            <SavesEmptyState {...emptyDefault} />
          )
        ) : groupByAuthor ? (
          getItemProps.grouped(items).map(([author, rows]) => (
            <div key={author} className="sl-group">
              <div className="sl-group-h">
                <span className="sl-group-name">{author}</span>
                <span className="sl-group-cnt">{rows.length}</span>
                <span className="sl-group-line" />
              </div>
              {rows.map((row) => getItemProps.render(row, dupCounts))}
            </div>
          ))
        ) : (
          items.map((row) => getItemProps.render(row, dupCounts))
        )}
      </div>
    </section>
  );
}

export function SimpleListPane({
  items,
  total,
  search,
  countLabel,
  renderItem,
  emptySearch,
  emptyDefault,
}) {
  const label = search ? (
    <>
      Znaleziono <b>{items.length}</b> z {total}
    </>
  ) : (
    countLabel(total)
  );

  return (
    <section role="tabpanel">
      <div className="sl-toolbar">
        <p className="sl-count">{label}</p>
      </div>
      <div className="sl-list">
        {items.length === 0 ? (
          search ? (
            <SavesEmptyState {...emptySearch} />
          ) : (
            <SavesEmptyState {...emptyDefault} />
          )
        ) : (
          items.map(renderItem)
        )}
      </div>
    </section>
  );
}

export function SavesLibraryFooter({ onRefresh, refreshing, links }) {
  return (
    <div className="sl-foot">
      <BrassButton disabled={refreshing} onClick={onRefresh} className="mt-0">
        {refreshing ? "Odświeżam…" : "Odśwież"}
      </BrassButton>
      <div className="sl-footlinks">
        {links.map((link) =>
          link.href ? (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ) : (
            <button
              key={link.label}
              type="button"
              className="linkish"
              onClick={link.onClick}
            >
              {link.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}

export function DisplayNameForm({
  value,
  onChange,
  onSave,
  saving,
  message,
}) {
  return (
    <div className="sl-name-form">
      <label className="mb-2 block text-[11px] uppercase tracking-[0.12em] text-brass">
        Nazwa podróżnika
      </label>
      <input
        type="text"
        minLength={3}
        maxLength={24}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="np. Zmierzch"
      />
      <BrassButton disabled={saving || value.trim().length < 3} onClick={onSave} className="mt-0">
        {saving ? "Zapisuję…" : "Zapisz nazwę"}
      </BrassButton>
      {message ? <p className="mt-2 text-xs text-mistsoft">{message}</p> : null}
    </div>
  );
}
