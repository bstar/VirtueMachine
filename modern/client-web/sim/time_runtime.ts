export function timeOfDayLabelRuntime(hour: number): string {
  const h = hour | 0;
  if (h < 5) return "Midnight";
  if (h < 8) return "Dawn";
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  if (h < 20) return "Dusk";
  return "Night";
}
