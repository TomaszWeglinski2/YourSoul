export const MAX_SUBMISSION_WORDS = 50;
export const MONTHLY_SUBMISSION_LIMIT = 5;
export const MIN_SUBMISSION_CHARS = 12;

export function countWords(text) {
  return String(text ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function validateSubmissionPayload({
  text,
  author,
  work,
  year,
  publicDomain,
}) {
  const trimmed = String(text ?? "").trim();

  if (!trimmed) {
    return { ok: false, error: "Treść cytatu jest wymagana." };
  }

  if (trimmed.length < MIN_SUBMISSION_CHARS) {
    return {
      ok: false,
      error: "Cytat jest zbyt krótki — podaj pełniejszą treść.",
    };
  }

  const words = countWords(trimmed);
  if (words > MAX_SUBMISSION_WORDS) {
    return {
      ok: false,
      error: `Cytat ma ${words} słów — limit to ${MAX_SUBMISSION_WORDS} (ryzyko prawne).`,
    };
  }

  if (/(.)\1{7,}/u.test(trimmed)) {
    return { ok: false, error: "Treść wygląda na spam." };
  }

  if (!String(author ?? "").trim()) {
    return { ok: false, error: "Autor jest wymagany przy zgłoszeniu do korpusu." };
  }

  if (!publicDomain) {
    return {
      ok: false,
      error:
        "Zgłoszenia do Wyroczni dotyczą wyłącznie cytatów z domeny publicznej (autor zmarł ponad 70 lat temu).",
    };
  }

  return {
    ok: true,
    text: trimmed,
    author: String(author ?? "").trim(),
    work: String(work ?? "").trim() || null,
    year: String(year ?? "").trim() || null,
    publicDomain: true,
  };
}

export function duplicateMessage(kind) {
  switch (kind) {
    case "corpus_exact":
      return "Ten cytat (ta sama treść i autor) jest już w korpusie Wyroczni.";
    case "corpus_text":
      return "Ta treść jest już w korpusie Wyroczni (inny autor w bazie).";
    case "corpus_similar":
      return "Bardzo podobny cytat jest już w korpusie — sprawdź, czy to nie duplikat.";
    case "pending":
      return "Identyczne zgłoszenie czeka już na moderację.";
    default:
      return "Podobny cytat jest już w systemie.";
  }
}

export const SUBMISSION_STATUS_LABELS = {
  pending: "oczekuje na moderację",
  accepted: "przyjęty do korpusu",
  rejected: "odrzucony",
};
