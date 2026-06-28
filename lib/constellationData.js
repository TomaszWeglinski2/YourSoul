export const TOWER_GLOSY = [
  [
    'pytanie „jak" i pytanie „po co" to nie dwie drogi, lecz jedna — nie zrozumiesz mechanizmu, póki nie wiesz, czemu chcesz go zrozumieć.',
    "najzimniejszy mechanizm i najgorętszy sens spotykają się w jednym: kto naprawdę pojął, jak coś działa, zwykle wie też, dlaczego to pokochał.",
    "rozkładać świat na części i pytać, co znaczy — to nie wrogowie; to wdech i wydech tego samego zdumienia, że cokolwiek w ogóle jest.",
  ],
  [
    "trzeźwość i zachwyt nie wykluczają się — najgłębszy podziw rodzi się dopiero wtedy, gdy przestajesz się łudzić, a świat i tak okazuje się cudem.",
    "chłodne oko, które niczego nie upiększa, i serce, które bije z zachwytu — to dwie strony tej samej uczciwości wobec rzeczy.",
    "zwątpienie oczyszcza zachwyt z naiwności — i dopiero podziw, który przeszedł przez sceptycyzm, jest nie do odebrania.",
  ],
  [
    "samotnia i wspólny ogień to dwa oddechy tej samej tęsknoty — wycofujesz się w siebie, by mieć co przynieść innym, i wracasz do innych, by wiedzieć, kim jesteś sam.",
    "najgłębsze, co masz dla ludzi, dojrzewa w samotności — a samotność, która nie wraca do nikogo, zamienia się w pustkę, nie w głębię.",
    "prawda prywatna i prawda dzielona nie są rywalkami: jedna jest korzeniem, druga owocem, a drzewo potrzebuje obu.",
  ],
  [
    "świat jest zarazem do policzenia i nie do pojęcia — dojrzałość to szukać wzoru, nie tracąc czci dla tego, co wzorowi się wymyka.",
    "im więcej wzoru odkrywasz, tym wyraźniej widać granicę, za którą wzór się kończy — i właśnie tam zaczyna się prawdziwa tajemnica.",
    "porządek bez tajemnicy jest martwy, tajemnica bez porządku jest chaosem — żywe jest tylko to, co ma jedno i drugie.",
  ],
  [
    "pociecha i wstrząs nie są wrogami — obie żądają jednego, byś nie odwracał wzroku: jedna byś wytrzymał prawdę, druga byś jej nie przespał.",
    "to, co koi, i to, co wstrząsa, służą tej samej rzeczy: żebyś dożył do rana i żebyś nie przespał życia; potrzebujesz obu, w różne noce.",
    "czasem najłagodniejsze słowo jest najbardziej wywrotowe, a najostrzejsze — najczulsze; nie myl tonu z prawdą, którą niesie.",
  ],
];

export const PRZESILENIA = [
  {
    axis: 0,
    name: "Skuteczność ↔ Znaczenie",
    a: "to, co działa",
    b: "to, co znaczy",
    beats: [
      {
        kick: "Przesilenie — Skuteczność ↔ Znaczenie",
        txt: "Masz przed sobą rozwiązanie, które zadziała bez pudła — szybkie, czyste, skuteczne. I drugie, które nie obiecuje wyniku, lecz ocala sens całej rzeczy.",
        btn: "Dalej",
      },
      {
        kick: "Nie ma dobrej opcji",
        txt: "Wybrać skuteczność znaczy dostać wynik i stracić to, po co zaczynałeś. Wybrać znaczenie znaczy zostać wiernym sensowi i może przegrać.",
        btn: "Stoisz na rozłamie",
      },
    ],
    pointa:
      "Skuteczność daje wynik, którego nie wstyd pokazać — ale wynik bez sensu bywa najgładszą formą porażki.",
  },
  {
    axis: 0,
    name: "Prostota ↔ Prawda",
    a: "prostą odpowiedź",
    b: "całą prawdę",
    beats: [
      {
        kick: "Przesilenie — Prostota ↔ Prawda",
        txt: "Pytają cię o coś wprost. Masz odpowiedź prostą, jasną, którą wszyscy zrozumieją — i drugą, prawdziwą, ale tak złożoną, że rozmyje się w głowach.",
        btn: "Dalej",
      },
      {
        kick: "Nie ma dobrej opcji",
        txt: "Prosta odpowiedź zostanie zapamiętana i zafałszuje rzecz. Cała prawda będzie wierna i nikt jej nie uniesie.",
        btn: "Stoisz na rozłamie",
      },
    ],
    pointa:
      "Prostota niesie dalej, lecz mniej; prawda niesie wiernie, lecz nie wszędzie dotrze.",
  },
  {
    axis: 1,
    name: "Trzeźwość ↔ Zachwyt",
    a: "trzeźwy chłód",
    b: "zachwyt",
    beats: [
      {
        kick: "Przesilenie — Trzeźwość ↔ Zachwyt",
        txt: "Otwiera się przed tobą chwila całkowitego uniesienia — miłości, wiary, piękna — o której wiesz, że jest po części złudzeniem.",
        btn: "Dalej",
      },
      {
        kick: "Nie ma dobrej opcji",
        txt: "Zachować trzeźwość znaczy nie dać się ponieść i może ocaleć — ale nigdy nie zaznać. Oddać się znaczy uwierzyć w coś, co może cię zwieść.",
        btn: "Stoisz na rozłamie",
      },
    ],
    pointa:
      "Trzeźwość chroni przed złudzeniem — ale czasem to złudzenie było jedyną prawdą, jaką dało się przeżyć.",
  },
  {
    axis: 1,
    name: "Cudza wiara ↔ Twoja trzeźwość",
    a: "cudzą wiarę",
    b: "własną trzeźwość",
    beats: [
      {
        kick: "Przesilenie — Cudza wiara ↔ Trzeźwość",
        txt: "Ktoś bliski żyje pięknym przekonaniem, które trzyma go przy życiu — a które ty widzisz jako złudzenie. Możesz mu je zostawić albo odebrać prawdą.",
        btn: "Dalej",
      },
      {
        kick: "Nie ma dobrej opcji",
        txt: "Zostawić znaczy uszanować jego siłę i być nieszczerym. Odebrać znaczy być wiernym prawdzie i zgasić światło, które go niosło.",
        btn: "Stoisz na rozłamie",
      },
    ],
    pointa:
      "Twoja trzeźwość bywa darem, a bywa okrucieństwem — nie zawsze prawda jest tym, czego ktoś potrzebuje, by żyć.",
  },
  {
    axis: 2,
    name: "Wierność ↔ Wolność",
    a: "wierność wspólnocie",
    b: "własną drogę",
    beats: [
      {
        kick: "Przesilenie — Wierność ↔ Wolność",
        txt: "Wspólnota, która cię uformowała i nigdy nie zawiodła, prosi cię dziś, byś został. Odejście będzie wyglądać jak zdrada.",
        btn: "Dalej",
      },
      {
        kick: "Nie ma dobrej opcji",
        txt: "Zostać znaczy oddać własną drogę, którą czujesz jak powołanie. Odejść znaczy zranić tych, którym zawdzięczasz, kim jesteś.",
        btn: "Stoisz na rozłamie",
      },
    ],
    pointa:
      "Wierność bywa domem, a bywa klatką — a wolność, która rani wiernych, nie jest jeszcze niewinna.",
  },
  {
    axis: 2,
    name: "Swoi ↔ Sprawiedliwość",
    a: "swoich",
    b: "sprawiedliwość",
    beats: [
      {
        kick: "Przesilenie — Swoi ↔ Sprawiedliwość",
        txt: "Ktoś z twoich — z rodziny, z bliskich — zawinił. Możesz go osłonić albo stanąć po stronie skrzywdzonego obcego.",
        btn: "Dalej",
      },
      {
        kick: "Nie ma dobrej opcji",
        txt: "Osłonić swoich znaczy zdradzić sprawiedliwość. Wydać ich znaczy zdradzić tych, którzy ci ufali jak nikomu.",
        btn: "Stoisz na rozłamie",
      },
    ],
    pointa:
      "Wierność swoim bywa cnotą i bywa zmową — a sprawiedliwość bez litości dla bliskich łatwo staje się okrucieństwem.",
  },
  {
    axis: 3,
    name: "Poznać ↔ Tajemnica",
    a: "poznanie",
    b: "nienaruszoną tajemnicę",
    beats: [
      {
        kick: "Przesilenie — Poznać ↔ Tajemnica",
        txt: "Masz wreszcie w ręku klucz, by rozłożyć na części rzecz, którą kochasz — wiarę, człowieka, zachwyt. Zrozumiesz ją do dna.",
        btn: "Dalej",
      },
      {
        kick: "Nie ma dobrej opcji",
        txt: "Poznać do końca znaczy rozpuścić tajemnicę, która była połową piękna. Zostawić nienaruszone znaczy nigdy nie wiedzieć.",
        btn: "Stoisz na rozłamie",
      },
    ],
    pointa:
      "Są rzeczy, które rozumiemy dopiero, gdy je rozbierzemy — i takie, które rozbierając, zabijamy.",
  },
  {
    axis: 3,
    name: "Pewność ↔ Wątpienie",
    a: "pewność",
    b: "uczciwe wątpienie",
    beats: [
      {
        kick: "Przesilenie — Pewność ↔ Wątpienie",
        txt: "Masz wybór: zatrzymać pewność, która daje ci grunt pod nogami, albo dopuścić wątpliwość, która jest uczciwsza, lecz odbiera oparcie.",
        btn: "Dalej",
      },
      {
        kick: "Nie ma dobrej opcji",
        txt: "Trzymać pewność znaczy stać na czymś, co może być nieprawdą. Dopuścić wątplienie znaczy być uczciwym i stracić dom.",
        btn: "Stoisz na rozłamie",
      },
    ],
    pointa:
      "Pewność daje grunt, lecz bywa złudna; wątplienie jest uczciwe, lecz nie da się na nim spać.",
  },
  {
    axis: 4,
    name: "Prawda ↔ Litość",
    a: "bezwzględną prawdę",
    b: "litość",
    beats: [
      {
        kick: "Przesilenie — Prawda ↔ Litość",
        txt: "Zmierzch. Ktoś, kogo kochasz, dożywa ostatnich dni — i pyta cię o rzecz, którą przez całe życie przed nim ukrywano.",
        btn: "Dalej",
      },
      {
        kick: "Nie ma dobrej opcji",
        txt: "Znasz prawdę. Prawda odbierze mu ostatni spokój. Łagodne kłamstwo da mu pogodną śmierć — ale zdradzi wszystko, co uznawałeś za swoje.",
        btn: "Stoisz na rozłamie",
      },
    ],
    pointa:
      "Prawda nie jest wyrokiem na cudzy spokój — ale litość, która kłamie, też ma swoją cenę.",
  },
  {
    axis: 4,
    name: "Spokój ↔ Bunt",
    a: "spokój",
    b: "bunt",
    beats: [
      {
        kick: "Przesilenie — Spokój ↔ Bunt",
        txt: "Wobec krzywdy, której nie zmienisz, masz wybór: znaleźć w sobie spokój i przyjąć ją, albo nie zgodzić się nigdy i nieść bunt, który cię wypali.",
        btn: "Dalej",
      },
      {
        kick: "Nie ma dobrej opcji",
        txt: "Spokój ocali ciebie i może pogodzi z niesprawiedliwością. Bunt zachowa twoją prawość i może cię zniszczyć.",
        btn: "Stoisz na rozłamie",
      },
    ],
    pointa:
      "Spokój wobec zła bywa mądrością i bywa kapitulacją; bunt bywa godnością i bywa samozniszczeniem. Nie ma tu czystej ręki.",
  },
];

export function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function pickPrzesilenie(axis) {
  const pool = PRZESILENIA.filter((item) => item.axis === axis);
  return pickRandom(pool.length ? pool : PRZESILENIA);
}

export function pickTowerGlosa(axis) {
  return pickRandom(TOWER_GLOSY[axis] ?? TOWER_GLOSY[0]);
}
