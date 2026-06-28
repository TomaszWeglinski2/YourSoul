import { buildXlsxBuffer } from "@/lib/adminXlsx";
import { EXPECTED_COLUMNS } from "@/lib/importQuotes";

const SAMPLES = {
  quotes: {
    filename: "your-soul-cytaty-przyklad.xlsx",
    headers: EXPECTED_COLUMNS,
    rows: [
      [
        "Bądź jak przylądek, o który nieustannie biją fale.",
        "Seneka",
        "Listy moralne",
        "65",
        "public_domain",
        "Filozofia",
        0.5,
        0,
        -0.5,
        0,
        -0.7,
        "Stoicyzm — stałość wobec chaosu.",
        true,
      ],
    ],
  },
  glosses: {
    filename: "your-soul-glosy-przyklad.xlsx",
    headers: ["quote_id", "angle", "text"],
    rows: [[12, "sens", "Inna faseta glosy do tego cytatu."]],
  },
  towers: {
    filename: "your-soul-wieze-przyklad.xlsx",
    headers: ["axis", "quote_ids", "meta_gloss", "variant"],
    rows: [
      [
        0,
        "12,27,19",
        'pytanie „jak" i pytanie „po co" to jedna droga — nie zrozumiesz mechanizmu, póki nie wiesz, czemu.',
        1,
      ],
    ],
  },
  przesilenie: {
    filename: "your-soul-przesilenia-przyklad.xlsx",
    headers: [
      "axis",
      "value_a",
      "value_b",
      "takt1",
      "takt2",
      "choice_a",
      "choice_b",
      "pointa",
      "variant",
    ],
    rows: [
      [
        0,
        "to, co działa",
        "to, co znaczy",
        "Masz przed sobą rozwiązanie, które zadziała bez pudła — szybkie, czyste, skuteczne.",
        "Wybrać skuteczność znaczy dostać wynik i stracić to, po co zaczynałeś.",
        "Ocal to, co działa",
        "Ocal to, co znaczy",
        "Skuteczność daje wynik — ale wynik bez sensu bywa najgładszą formą porażki.",
        1,
      ],
    ],
  },
  cienie: {
    filename: "your-soul-cienie-przyklad.xlsx",
    headers: ["quote_id", "cien"],
    rows: [
      [
        12,
        "Pisał to człowiek, który sam walczył z ciemnością — i wiedział, że słowa nigdy go nie ocalią. To też jesteś Ty, gdy dopisujesz przy tym swój margines.",
      ],
    ],
  },
};

export function getSampleTypes() {
  return Object.keys(SAMPLES);
}

export function buildSampleXlsx(type) {
  const sample = SAMPLES[type];
  if (!sample) {
    return null;
  }

  const buffer = buildXlsxBuffer(sample.headers, sample.rows);
  return { buffer, filename: sample.filename };
}

export function getSampleDescription(type) {
  const descriptions = {
    quotes: EXPECTED_COLUMNS.join(", "),
    glosses: "quote_id, angle, text",
    towers: "axis, quote_ids, meta_gloss, variant",
    przesilenie:
      "axis, value_a, value_b, takt1, takt2, choice_a, choice_b, pointa, variant",
    cienie: "quote_id, cien",
  };
  return descriptions[type] ?? "";
}
