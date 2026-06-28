export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col items-center text-center gap-6">
        <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-brass">
          Your Soul
        </p>

        <h1 className="font-serif text-4xl font-medium leading-tight text-[#ece6d8]">
          Your Soul
        </h1>

        <p className="font-sans text-sm leading-relaxed text-mist">
          Zatrzymaj się na chwilę — to droga w głąb siebie, krok po kroku.
        </p>

        <button
          type="button"
          className="mt-2 w-full rounded-xl border border-brass bg-brass px-5 py-3.5 font-sans text-sm text-[#fff8ec] transition-all duration-150 hover:bg-brassdeep hover:-translate-y-px"
        >
          Stań u Wrót
        </button>
      </div>
    </main>
  );
}
