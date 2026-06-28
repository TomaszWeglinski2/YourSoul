import { AXES } from "@/lib/journeyConstants";

/** 15 kotwic kalibracyjnych — stałe odniesienie przy edycji osi w panelu. */
export const CALIBRATION_ANCHORS = [
  {
    label: "Skuteczność",
    text: "Zrób, co trzeba — wynik jest miarą.",
    axes: [0.85, -0.2, 0.1, -0.3, 0.2],
  },
  {
    label: "Znaczenie",
    text: "Po co to wszystko, skoro nie niesie sensu?",
    axes: [-0.8, 0.3, 0.2, 0.4, -0.2],
  },
  {
    label: "Trzeźwość",
    text: "Patrz bez iluzji — świat nie musi cię pocieszać.",
    axes: [0.2, -0.85, 0, 0.3, -0.4],
  },
  {
    label: "Zachwyt",
    text: "Serce staje, gdy widzi, że cokolwiek w ogóle jest.",
    axes: [0.3, 0.9, 0.2, 0.5, 0.1],
  },
  {
    label: "Samotność",
    text: "Prawdę najgłębiej słyszę, gdy nikt nie patrzy.",
    axes: [0.1, -0.1, -0.85, 0.2, 0],
  },
  {
    label: "Wspólnota",
    text: "Przy wspólnym ogniu prawda staje się nasza.",
    axes: [0.2, 0.3, 0.85, -0.2, 0.1],
  },
  {
    label: "Mechanizm",
    text: "Rozłóż to na części — wtedy wiesz, jak działa.",
    axes: [0.6, -0.4, 0, -0.7, 0.2],
  },
  {
    label: "Tajemnica",
    text: "Nie wszystko da się pojąć — i właśnie dlatego żyje.",
    axes: [-0.3, 0.5, 0, 0.9, 0.2],
  },
  {
    label: "Pewność",
    text: "Wiem, na czym stoję — to daje spokój.",
    axes: [0.4, -0.2, 0.1, -0.6, -0.3],
  },
  {
    label: "Wątpliwość",
    text: "Każda pewność może być złudzeniem — pytaj dalej.",
    axes: [-0.2, 0.1, -0.2, 0.7, 0.4],
  },
  {
    label: "Pociecha",
    text: "Niech to słowo cię utuli — jutro też będzie dzień.",
    axes: [-0.3, 0.2, 0.3, 0, -0.85],
  },
  {
    label: "Prowokacja",
    text: "Obudź mnie — nie pozwól mi przespać życia.",
    axes: [0.2, 0.4, 0.1, 0.2, 0.9],
  },
  {
    label: "Porządek",
    text: "Świat ma wzór — szukaj go uważnie.",
    axes: [0.5, -0.3, 0, -0.5, 0],
  },
  {
    label: "Paradoks",
    text: "Im więcej wiem, tym mniej rozumiem — i to jest uczciwe.",
    axes: [-0.4, 0.4, -0.1, 0.6, 0.3],
  },
  {
    label: "Litość",
    text: "Czasem prawda może poczekać — człowiek jest ważniejszy.",
    axes: [-0.2, 0.2, 0.4, -0.2, -0.7],
  },
];

export const AXIS_STEP_VALUES = [-1, -0.5, 0, 0.5, 1];

export function axisLabel(index) {
  return AXES[index] ?? `Oś ${index}`;
}
