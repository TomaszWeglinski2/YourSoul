import { AXES } from "@/lib/journeyConstants";

export { AXES };

export function normalizeSearch(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function pad2(n) {
  return n < 10 ? `0${n}` : String(n);
}

export function formatFullTime(iso) {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "—";
  return `${pad2(dt.getDate())}.${pad2(dt.getMonth() + 1)}.${dt.getFullYear()}, ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}:${pad2(dt.getSeconds())}`;
}

export function formatRelativeTime(iso, now = new Date()) {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "—";

  const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((dayStart(now) - dayStart(dt)) / 86400000);
  const hm = `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;

  if (diff === 0) return `dziś, ${hm}`;
  if (diff === 1) return `wczoraj, ${hm}`;
  if (diff > 1 && diff < 7) return `${diff} dni temu`;
  return `${pad2(dt.getDate())}.${pad2(dt.getMonth() + 1)}.${dt.getFullYear()}, ${hm}`;
}

export function authorInitial(name) {
  const trimmed = String(name ?? "").trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

export function pluralPl(n, one, few, many) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n === 1) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
  return many;
}

export function collectionDupCounts(collections) {
  const map = {};
  for (const row of collections) {
    const author = row.quotes?.author ?? "";
    const text = row.quotes?.text ?? "";
    const key = `${author}|${text}`;
    map[key] = (map[key] ?? 0) + 1;
  }
  return map;
}

export function filterCollections(collections, query) {
  const q = normalizeSearch(query);
  if (!q) return collections;
  return collections.filter((row) => {
    const text = normalizeSearch(row.quotes?.text);
    const author = normalizeSearch(row.quotes?.author);
    const work = normalizeSearch(row.quotes?.work);
    return text.includes(q) || author.includes(q) || work.includes(q);
  });
}

export function sortCollections(collections, sort) {
  const arr = [...collections];
  if (sort === "old") {
    arr.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  } else if (sort === "author") {
    arr.sort((a, b) => {
      const au = (a.quotes?.author ?? "").localeCompare(b.quotes?.author ?? "", "pl");
      if (au !== 0) return au;
      return String(b.created_at).localeCompare(String(a.created_at));
    });
  } else {
    arr.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }
  return arr;
}

export function groupCollectionsByAuthor(collections) {
  const groups = new Map();
  for (const row of collections) {
    const author = row.quotes?.author ?? "—";
    if (!groups.has(author)) {
      groups.set(author, []);
    }
    groups.get(author).push(row);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "pl"));
}

export function filterMargins(margins, query) {
  const q = normalizeSearch(query);
  if (!q) return margins;
  return margins.filter((row) => {
    const body = normalizeSearch(row.body);
    const text = normalizeSearch(row.quotes?.text);
    const author = normalizeSearch(row.quotes?.author);
    return body.includes(q) || text.includes(q) || author.includes(q);
  });
}

export function filterReactions(reactions, query) {
  const q = normalizeSearch(query);
  if (!q) return reactions;
  return reactions.filter((row) => {
    const label = normalizeSearch(reactionLabel(row));
    const body = normalizeSearch(row.margins?.body);
    const text = normalizeSearch(row.margins?.quotes?.text);
    const author = normalizeSearch(row.margins?.quotes?.author);
    return (
      label.includes(q) ||
      body.includes(q) ||
      text.includes(q) ||
      author.includes(q) ||
      normalizeSearch(String(row.margin_id)).includes(q)
    );
  });
}

export function reactionLabel(row) {
  const quote = row.margins?.quotes?.text;
  if (quote) {
    const snippet = quote.length > 48 ? `${quote.slice(0, 48)}…` : quote;
    return `Rezonans przy „${snippet}"`;
  }
  return `Margines #${row.margin_id}`;
}

export function filterZielnikStars(stars, query) {
  const q = normalizeSearch(query);
  if (!q) return stars;
  return stars.filter((star) => {
    return (
      normalizeSearch(star.t).includes(q) ||
      normalizeSearch(star.a).includes(q) ||
      normalizeSearch(star.w).includes(q) ||
      normalizeSearch(star.g).includes(q)
    );
  });
}

export function sortZielnikStars(stars, sort) {
  const arr = [...stars];
  if (sort === "old") {
    arr.sort((a, b) => String(a.savedAt ?? "").localeCompare(String(b.savedAt ?? "")));
  } else if (sort === "author") {
    arr.sort((a, b) => {
      const au = (a.a ?? "").localeCompare(b.a ?? "", "pl");
      if (au !== 0) return au;
      return String(b.savedAt ?? "").localeCompare(String(a.savedAt ?? ""));
    });
  } else {
    arr.sort((a, b) => String(b.savedAt ?? "").localeCompare(String(a.savedAt ?? "")));
  }
  return arr;
}

export function groupStarsByAuthor(stars) {
  const groups = new Map();
  for (const star of stars) {
    const author = star.a ?? "—";
    if (!groups.has(author)) {
      groups.set(author, []);
    }
    groups.get(author).push(star);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "pl"));
}

export function marginsListFromMap(marginsByQuote, stars) {
  const starById = Object.fromEntries(stars.map((s) => [String(s.id), s]));
  return Object.entries(marginsByQuote)
    .filter(([, margin]) => margin?.body?.trim())
    .map(([quoteId, margin]) => ({
      id: quoteId,
      body: margin.body,
      visibility: margin.visibility ?? "private",
      created_at: margin.created_at ?? null,
      quotes: {
        text: starById[quoteId]?.t ?? "",
        author: starById[quoteId]?.a ?? "",
      },
    }))
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
}

export function filterZielnikMargins(items, query) {
  const q = normalizeSearch(query);
  if (!q) return items;
  return items.filter((row) => {
    return (
      normalizeSearch(row.body).includes(q) ||
      normalizeSearch(row.quotes?.text).includes(q) ||
      normalizeSearch(row.quotes?.author).includes(q)
    );
  });
}

export function filterNici(threads, query, starById) {
  const q = normalizeSearch(query);
  if (!q) return threads;
  return threads.filter((thread) => {
    const qa = starById[thread.a];
    const qb = starById[thread.b];
    return (
      normalizeSearch(thread.glosa).includes(q) ||
      normalizeSearch(qa?.a).includes(q) ||
      normalizeSearch(qb?.a).includes(q) ||
      normalizeSearch(thread.type).includes(q)
    );
  });
}

export function clampAxis(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.max(-1, Math.min(1, n));
}

export function axisBarStyle(value) {
  const v = clampAxis(value);
  const positive = v >= 0;
  const left = positive ? 50 : 50 + v * 50;
  const width = Math.abs(v) * 50;
  return { positive, left, width, label: `${v > 0 ? "+" : ""}${v.toFixed(2)}` };
}
