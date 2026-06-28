import { SONDA } from "@/lib/journeyConstants";

export function clamp(x) {
  return Math.max(-1, Math.min(1, x));
}

/** Jak w prototypie: wektor sondy × skala szczerości z suwaka. */
export function computeOdcisk(sondaIndex, honesty) {
  const scale = 0.3 + 0.7 * (honesty / 100);
  const base = SONDA[sondaIndex].v;
  return base.map((x) => clamp(x * scale));
}

/** cel[i] = clamp(odcisk[i]*0.4 + nastroj[i]) — jak targetVec w prototypie. */
export function computeTarget(odcisk, nastroj) {
  return odcisk.map((o, i) => clamp(o * 0.4 + nastroj[i]));
}

export function vectorDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < 5; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** „Jeszcze w tym tonie" — jak w prototypie po kliknięciu #more. */
export function adjustMoodTowardQuote(mood, quoteAxes) {
  return mood.map((m, i) => clamp(0.5 * m + 0.6 * quoteAxes[i]));
}

export function parseAxes(raw) {
  if (Array.isArray(raw)) {
    return raw.map(Number);
  }
  if (typeof raw === "string") {
    const trimmed = raw.replace(/^\[/, "").replace(/\]$/, "");
    return trimmed.split(",").map((part) => Number(part.trim()));
  }
  return [0, 0, 0, 0, 0];
}

export function isVectorArray(value) {
  return (
    Array.isArray(value) &&
    value.length === 5 &&
    value.every((n) => typeof n === "number" && !Number.isNaN(n))
  );
}
