export function hasValidOdcisk(odcisk) {
  if (!Array.isArray(odcisk) || odcisk.length !== 5) {
    return false;
  }
  return odcisk.some((value) => Math.abs(Number(value)) > 0.001);
}
