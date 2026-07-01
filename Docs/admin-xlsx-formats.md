# Panel admin — format plików .xlsx

Hasło: zmienna `ADMIN_PASSWORD`. Import zawsze po stronie serwera (`service_role`).

---

## 1. Cytaty (`quotes` + opcjonalnie `quote_glosses`)

**Arkusz:** pierwszy w pliku  
**Nagłówki (wiersz 1) — import:**

| id | text | author | work | year | rights | dom | sens | zachwyt | wspolnota | tajemnica | prowokacja | glosa | source_verified |
|----|------|--------|------|------|--------|-----|------|---------|-----------|-----------|------------|-------|-----------------|

- `id` — opcjonalne przy imporcie; przy eksporcie zawsze na początku. Wiersz z `id` → UPDATE; bez `id` → INSERT lub UPDATE po `text` + `author` (bez duplikatów).
- Osie: liczby −1 … +1 (w panelu suwaki skokowe: −1 / −0.5 / 0 / +0.5 / +1).
- `dom`: jedna domena lub lista rozdzielona przecinkiem.
- `source_verified`: `true` / `false` / puste (= false).

**Eksport (panel /admin → zakładka Cytaty):**
- „Pobierz z bazy jako .xlsx” — pełny korpus z kolumną `id`.
- Filtry opcjonalne: tylko nieweryfikowane, domena (`dom`), data `created_at` od.
- „Cytaty z osiami (do generowania powiązań)” — lekki plik: `id, author, text, sens, zachwyt, wspolnota, tajemnica, prowokacja`.

**SQL deduplikacji:** `Docs/supabase-admin-quotes-unique.sql` — unikalny indeks `(text, author)`.

---

## 2. Glosy (`quote_glosses`)

| quote_id | angle | text |
|----------|-------|------|
| 12 | sens | Inna faseta glosy do tego cytatu. |

- `angle`: opcjonalny tag (np. sens, zachwyt) — metadane redaktora.
- Jeden cytat może mieć wiele wierszy.

---

## 3. Wieże (`towers`)

| axis | quote_ids | meta_gloss | variant |
|------|-----------|------------|---------|
| 0 | 12,27,19 | Meta-glosa wieży dla osi Sens… | 1 |

- `axis`: 0–4 (Sens, Zachwyt, Wspólnota, Tajemnica, Prowokacja).
- `quote_ids`: 3–4 id cytatów, rozdzielone przecinkiem; przy imporcie ostrzeżenie, jeśli na tej osi brak przeciwległych biegunów (min ≤ −0.4 i max ≥ +0.4).
- `variant`: numer wariantu tekstu (domyślnie 1).

---

## 4. Przesilenia (`przesilenie_templates`)

| axis | value_a | value_b | takt1 | takt2 | choice_a | choice_b | pointa | variant |
|------|---------|---------|-------|-------|----------|----------|--------|---------|
| 0 | to, co działa | to, co znaczy | Masz przed sobą… | Nie ma dobrej opcji… | Ocal to, co działa | Ocal to, co znaczy | Skuteczność daje wynik… | 1 |

- `takt1`, `takt2`: teksty scen (zapisane w `beats` jako JSON):
  ```json
  [
    { "kick": "Przesilenie — …", "txt": "…takt1…", "btn": "Dalej" },
    { "kick": "Nie ma dobrej opcji", "txt": "…takt2…", "btn": "Stoisz na rozłamie" }
  ]
  ```
- Przy grze (Krok 9): wybór szablonu po `axis` z `tensionAxis` nici napięcia.

---

## 5. Cienie (`quotes.cien`)

| quote_id | cien |
|----------|------|
| 12 | Autor żył w… — ton tragiczno-ludzki, zamknięte zdaniem-lustrem. |

- Ustawia `quotes.cien` (opcjonalne; tylko postacie dawno zmarłe).

---

## 6. Jakość / czyszczenie (bez importu — widok w panelu)

- Sortowanie: `quality` = liczba `collections` − liczba `quote_flags`.
- Na górze: najniższe `quality` i cytaty z flagami.
- Akcja „ukryj/usuń”: `quotes.status = 'hidden'` (nie kasuje wiersza).

---

## Kolejność SQL w Supabase

1. `supabase-schema-align.sql` (jeśli jeszcze nie)
2. `supabase-admin-templates.sql` (tabele `towers`, `przesilenie_templates`)

Potem dopiero panel /admin z pięcioma sekcjami (Krok 8).

---

## Eksport z bazy (panel /admin)

Hasło: `ADMIN_PASSWORD`. Route: `POST /api/admin/export` (service_role, tylko admin).

| Zakładka | Przycisk | Typ API `type` |
|----------|----------|----------------|
| Cytaty | Pobierz z bazy jako .xlsx | `quotes` |
| Cytaty | Cytaty z osiami… | `quotes-axes-prompt` |
| Glosy | Pobierz z bazy jako .xlsx | `glosses` |
| Wieże | Pobierz z bazy jako .xlsx | `towers` |
| Przesilenia | Pobierz z bazy jako .xlsx | `przesilenie` |
| Cienie | Pobierz z bazy jako .xlsx | `cienie` |

Kolumny eksportu = kolumny importu (cytaty: + `id` z przodu). Pliki nadają się do edycji i re-importu.
