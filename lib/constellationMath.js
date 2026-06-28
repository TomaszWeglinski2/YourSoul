import { parseAxes } from "@/lib/journeyMath";

export function lastName(author) {
  if (!author) return "?";
  return author.split(" ").pop();
}

export function layoutStars(stars) {
  const n = stars.length;
  const positions = stars.map((star, index) => {
    const v = star.v;
    const x = 200 + 120 * ((v[0] + v[2]) / 2) + ((index * 53) % 18) - 9;
    const y = 205 - 120 * ((v[4] + v[3]) / 2) + ((index * 71) % 18) - 9;
    return { x, y };
  });

  const MIN = 58;
  for (let iteration = 0; iteration < 140; iteration++) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 0.01;
        if (distance < MIN) {
          const push = (MIN - distance) / 2;
          const ux = dx / distance;
          const uy = dy / distance;
          positions[i].x -= ux * push;
          positions[i].y -= uy * push;
          positions[j].x += ux * push;
          positions[j].y += uy * push;
        }
      }
    }
    for (let k = 0; k < n; k++) {
      positions[k].x = Math.max(50, Math.min(350, positions[k].x));
      positions[k].y = Math.max(62, Math.min(352, positions[k].y));
    }
  }

  const map = {};
  stars.forEach((star, index) => {
    map[star.id] = positions[index];
  });
  return map;
}

export function axisOfMaxDiff(quoteA, quoteB) {
  let best = 0;
  let bestDiff = -1;
  for (let k = 0; k < 5; k++) {
    const diff = Math.abs(quoteA.v[k] - quoteB.v[k]);
    if (diff > bestDiff) {
      bestDiff = diff;
      best = k;
    }
  }
  return best;
}

/** Jak w prototypie — −1 gdy brak sprzeczności. */
export function tensionAxis(quoteA, quoteB) {
  let best = -1;
  let bestSpan = 0;

  for (let k = 0; k < 5; k++) {
    const lo = Math.min(quoteA.v[k], quoteB.v[k]);
    const hi = Math.max(quoteA.v[k], quoteB.v[k]);
    if (lo <= -0.35 && hi >= 0.35) {
      const span = hi - lo;
      if (span > bestSpan) {
        bestSpan = span;
        best = k;
      }
    }
  }

  if (best < 0) {
    for (let k = 0; k < 5; k++) {
      const gap = Math.abs(quoteA.v[k] - quoteB.v[k]);
      if (gap >= 1.0 && gap > bestSpan) {
        bestSpan = gap;
        best = k;
      }
    }
  }

  return best;
}

export function findTowers(stars, threads) {
  const ids = stars.map((star) => star.id);
  const adjacency = {};
  ids.forEach((id) => {
    adjacency[id] = [];
  });

  threads.forEach((thread) => {
    if (thread.type !== "napiecie" && adjacency[thread.a] && adjacency[thread.b]) {
      adjacency[thread.a].push(thread.b);
      adjacency[thread.b].push(thread.a);
    }
  });

  const seen = {};
  const components = [];

  ids.forEach((id) => {
    if (seen[id]) return;
    const stack = [id];
    const component = [];
    seen[id] = true;
    while (stack.length) {
      const current = stack.pop();
      component.push(current);
      adjacency[current].forEach((neighbor) => {
        if (!seen[neighbor]) {
          seen[neighbor] = true;
          stack.push(neighbor);
        }
      });
    }
    if (component.length >= 3) {
      components.push(component);
    }
  });

  const starById = Object.fromEntries(stars.map((star) => [star.id, star]));
  const towers = [];

  components.forEach((component) => {
    for (let axis = 0; axis < 5; axis++) {
      let min = 9;
      let max = -9;
      component.forEach((id) => {
        const value = starById[id]?.v[axis] ?? 0;
        min = Math.min(min, value);
        max = Math.max(max, value);
      });
      if (min <= -0.4 && max >= 0.4) {
        towers.push({ comp: component, axis });
        return;
      }
    }
  });

  return towers;
}

export function normalizeStarFromDb(row) {
  const quote = row.quotes ?? row;
  const glosses = quote.quote_glosses;
  const glosa = Array.isArray(glosses)
    ? glosses[0]?.glosa ?? null
    : quote.glosa ?? null;

  return {
    id: quote.id ?? row.quote_id,
    t: quote.text,
    a: quote.author,
    w: quote.work,
    g: glosa,
    cien: quote.cien ?? null,
    v: parseAxes(quote.axes),
  };
}

export function normalizeThreadFromDb(row) {
  return {
    id: row.id,
    a: row.quote_a_id,
    b: row.quote_b_id,
    type: row.type,
    glosa: row.glosa,
    axis: row.axis,
  };
}
