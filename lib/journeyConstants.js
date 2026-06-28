export const DICHO = [
  {
    axis: 0,
    q: "Pociąga mnie raczej…",
    neg: "to, jak coś działa",
    pos: "to, co coś znaczy",
  },
  {
    axis: 4,
    q: "Dziś chcę, by mnie…",
    neg: "ukojono",
    pos: "wstrząśnięto",
  },
  {
    axis: 3,
    q: "Bliżej mi do…",
    neg: "tego, co da się rozłożyć na części",
    pos: "tego, co pozostaje tajemnicą",
  },
  {
    axis: 2,
    q: "Prawdy szukam…",
    neg: "w samotności",
    pos: "przy wspólnym ogniu",
  },
  {
    axis: 1,
    q: "Świat budzi we mnie raczej…",
    neg: "trzeźwy chłód",
    pos: "zachwyt",
  },
];

export const ECHO = [
  {
    m: "Czytam to trzeci raz i za każdym razem znaczy co innego.",
    by: "Hanna",
  },
  {
    m: "Zapisałam to sobie nad biurkiem lata temu. Wraca.",
    by: "Tomasz",
  },
];

export const AXES = [
  "Sens",
  "Zachwyt",
  "Wspólnota",
  "Tajemnica",
  "Prowokacja",
];

export const WORLDS = [
  "Literatura i poezja",
  "Filozofia",
  "Duchowość",
  "Historia",
  "Nauka i kosmos",
  "Psychologia",
  "Sztuka",
  "Muzyka",
];

export const SONDA = [
  {
    t: "Bądź jak przylądek, o który nieustannie biją fale — on trwa, a wokół niego zasypia wzburzony żywioł.",
    v: [0.5, 0, -0.5, 0, -0.7],
  },
  {
    t: "Piękno jest jedynie początkiem grozy, którą jeszcze zdołamy znieść.",
    v: [0.5, 0.7, 0, 0.7, 0.5],
  },
  {
    t: "Kto walczy z potworami, niech baczy, by sam nie stał się potworem.",
    v: [0.5, 0.3, 0, 0.3, 0.7],
  },
];

export const INITIAL_JOURNEY_STATE = {
  worlds: [],
  odcisk: [0, 0, 0, 0, 0],
  mood: [0, 0, 0, 0, 0],
  honesty: 60,
  sonda: null,
  di: 0,
  wrotaComplete: false,
  shown: [],
  current: null,
  marg: {},
  pub: {},
  flagged: {},
  zielnik: [],
  resonance: {},
};
