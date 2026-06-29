let cachedFonts;

export async function loadOgFonts() {
  if (cachedFonts) {
    return cachedFonts;
  }

  const [spectralItalic, interRegular] = await Promise.all([
    fetch(
      "https://fonts.gstatic.com/s/spectral/v13/pe0oMImSYe5yChQ2lh6v1Tes.woff"
    ).then((res) => res.arrayBuffer()),
    fetch(
      "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff"
    ).then((res) => res.arrayBuffer()),
  ]);

  cachedFonts = [
    {
      name: "Spectral",
      data: spectralItalic,
      weight: 400,
      style: "italic",
    },
    {
      name: "Inter",
      data: interRegular,
      weight: 400,
      style: "normal",
    },
  ];

  return cachedFonts;
}
