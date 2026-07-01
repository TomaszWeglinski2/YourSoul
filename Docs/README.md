# Your Soul — README projektu

> **Po co ten plik.** Krótki, gęsty kontekst projektu — dla Cursora (gdy pisze kod) i dla mnie. Zawiera tylko to, co kształtuje każdą funkcję. Pełna specyfikacja jest w `Your-Soul-GDD-v4.md`; tu jest destylat. **Cursorze: traktuj „Zasady DNA" poniżej jako twarde ograniczenia — nie łam ich, nawet jeśli prosi o to pojedynczy prompt.**

## Czym to jest (jedno zdanie)
Niszowy, kontemplacyjny serwis społecznościowy, który łączy ludzi po **sposobie myślenia** (pięć osi wrażliwości), a nie po deklaracjach czy lajkach. To **nie są media społecznościowe — to rytuał.**

## Rdzeń
- **Pięć osi wrażliwości**, każda w zakresie −1..+1, w stałej kolejności: **[Sens, Zachwyt, Wspólnota, Tajemnica, Prowokacja]**.
  - Sens: Mechanizm (−1) ↔ Sens (+1)
  - Zachwyt: Sceptycyzm (−1) ↔ Zachwyt (+1)
  - Wspólnota: Samotnia (−1) ↔ Wspólny ogień (+1)
  - Tajemnica: Porządek (−1) ↔ Tajemnica (+1)
  - Prowokacja: Pocieszenie (−1) ↔ Prowokacja (+1)
- **Ścieżka uczestnika:** Wrota (wejście) → Wyrocznia (dobór cytatu po 5 osiach) → glosa + margines + jedna z trzech akcji → zielnik → Konstelacja (gwiazdy, nici, Wieże) → Przesilenia → cień (przy własnym marginesie) → warstwa społeczna: niebo bliskich i Rozmowy 1:1 → przestrzeń twórcza.
- **Dobór** to po prostu najbliższy wektor 5 osi (odległość w 5 wymiarach, w bazie przez pgvector). Żadnych „embeddingów AI" w rdzeniu — te 5 liczb to cały wektor.
- **Zasada spinająca głębię:** walutą głębi jest **własne słowo gracza**. Wieża, Przesilenie i cień otwierają się dopiero, gdy gracz pisze (nazywa nić, dopisuje margines) — nie da się ich naklikać.

## Słownik nazw (STAŁE — używaj ich w kodzie, nie tłumacz ani nie zmieniaj)
- **Wrota** — wejście/weryfikacja (wybór światów + sonda z suwakiem szczerości → odcisk).
- **odcisk** — wektor 5 osi opisujący użytkownika.
- **Wyrocznia** — rytuał: dychotomie nastroju → dobór cytatu → glosa → margines.
- **glosa** — krótki komentarz interpretacyjny przy cytacie (NIE „rozkmina").
- **margines** — własna notatka użytkownika pod cytatem (prywatna lub publiczna).
- **rezonans** — cichy gest „to też mnie poruszyło" (zamiast lajka).
- **trzy akcje przy cytacie** — „to zostaje ze mną" (wchodzi do konstelacji), „zostaw w ciszy" (dobry, ale nie dla mnie — nie wchodzi), „to oklepane — zgłoś do usunięcia" (sygnał dla redakcji, nie wchodzi). Rozłączne; usunięto dawne „trafia we mnie".
- **zielnik** — prywatna antologia: zapisane cytaty + własne marginesy + nici.
- **Konstelacja** — mapa zapisanych cytatów jako gwiazd; **nici** łączą gwiazdy. **Bez limitu ilościowego** — niebo rośnie latami; selektywność daje bramka rezonansu (wchodzi tylko to, co świadomie zachowasz), nie limit liczby.
- **nić** — połączenie dwóch gwiazd: *pokrewieństwo* (rymują się) albo *napięcie* (kłócą się). Nić napięcia da się poprowadzić **tylko** przy realnej sprzeczności (gwiazdy na przeciwnych biegunach osi — `tensionAxis`).
- **Wieża Sensu** — synteza wyłaniająca się ze zgody między przeciwnymi biegunami jednej osi (treść autorska, wiele wariantów na oś); wymaga ręcznego splecenia ≥3 nici pokrewieństwa.
- **Przesilenie** — przeżyta przypowieść z konfliktu dwóch wartości gracza; **wykuwane ręcznie** nazwaną nicią napięcia (nie auto-wykrywane), zakończone pointą-lustrem (treść autorska, wiele wariantów na oś).
- **cień** — „człowiek za słowem": sprzeczność biograficzna dawno zmarłego autora; odsłania się **tylko w zielniku i tylko przy cytatach z własnym marginesem**, tonem tragiczno-ludzkim.
- **Rozmowy** — skrzynka prywatnych konwersacji 1:1, każda z „gotowym początkiem" (wspólna nić: cytat + margines), trwałych między sesjami; widać tylko nick rozmówcy. Inicjowanie rozmowy jest za bramką PRO.

## Zasady DNA (NIE łam — kształtują każdą funkcję)
1. **Brak feedu i brak punktacji u użytkownika.** Zamiast lajków — rezonans. Bez liczników obserwujących, streaków, grindu, widocznych rankingów.
2. **Prywatność i anonimowość.** Marginesy, konstelacja i wybory przesileń **nigdy** nie są udostępniane na zewnątrz ani innym użytkownikom (wyjątek: opcjonalne, anonimowe „grubienie" wspólnych nici). Na zewnątrz ujawniamy **tylko nick**, nigdy imienia i nazwiska; kto chce, pozostaje niewidoczny (nie pojawia się jako gwiazda na cudzych mapach).
3. **AI nigdy nie generuje cytatów.** Cytaty pochodzą wyłącznie z ręcznie zweryfikowanej bazy (model bywa, że konfabuluje). AI najwyżej szkicuje glosę do redakcji.
4. **Wysoki próg wejścia (Wrota) to cecha, nie błąd.**
5. **Jakość, nie ilość.** Przy nudzie/powtarzalności podnosimy jakość i różnorodność treści, nie częstotliwość.
6. **Geografia nie jest pierwszym sitem.** Dopasowanie jest globalne, po wrażliwości; geografia to opcjonalny filtr (domyślnie wyłączony), tylko dla osób idących ku spotkaniu na żywo.
7. **Wieże i Przesilenia muszą za każdym razem nieść odrębną myśl** — to treść autorska z wariantami, nie generyczne szablony.

## Stack techniczny
- **Next.js** (App Router, JavaScript) + **Tailwind CSS** — front i backend w jednym.
- **Supabase** (PostgreSQL + logowanie) + **pgvector** (wyszukiwanie po wektorze 5 osi).
- **Vercel** — hosting (publikacja z GitHuba).
- Wygląd: paleta zmierzch/papier/mosiądz, fonty **Spectral** + **Inter** (wzór: `your-soul-prototyp.html`).

## Treść i panel redaktora
- Cytaty (z domeny publicznej, ręcznie weryfikowane), glosy/fasety, Wieże, Przesilenia i cienie powstają w **panelu redaktora** (`/admin`), dostępnym tylko dla redaktora — **nigdy u użytkownika**.
- Wszystko **importowalne z Excela**, w **pięciu osobnych plikach**: cytaty (z glosą główną i `source_verified`), glosy dodatkowe (`quote_id, angle, text`), cienie (`quote_id, cien`), Wieże (`axis, quote_ids, meta_gloss, variant`), Przesilenia (`axis, value_a, value_b, takt1, takt2, choice_a, choice_b, pointa, variant`). Glosy/cienie/Wieże wiążą się z cytatami przez `quote_id` — więc dla nowych cytatów dodaje się je po imporcie, gdy `id` są znane.
- **Jakość cytatu (sygnał dla redakcji):** pozytywny = ile osób zachowało cytat w konstelacji („to zostaje ze mną"); negatywny = zgłoszenia „oklepane" (`quote_flags`). `quality` = zachowania − zgłoszenia, liczone serwerowo. Decyzja o usunięciu tylko w panelu.

## Powiązane dokumenty
- `your-soul-prototyp.html` — działający prototyp solowej ścieżki; **wzór wyglądu i logiki**.
- `prompt-do-cursora.md` — budowa aplikacji **krok po kroku** (od zera do serwera).
- `Your-Soul-przeglad-i-kalibracja.md` — mapa systemu, nazewnictwo i **przewodnik kalibracji 5 osi z przykładami**.
- `kotwice-kalibracyjne.md` — 15 wzorcowych cytatów (kalibracja 5 osi); ziarno korpusu.
- `brief-kuratorski.md` — jak pisać glosy oraz **Wieże i Przesilenia**.
- `Your-Soul-GDD-v4.md` — pełny dokument projektowy (nadrzędny, v4.1).
