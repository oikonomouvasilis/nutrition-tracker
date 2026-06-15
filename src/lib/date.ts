// Ημερομηνίες σε μορφή YYYY-MM-DD (τοπική ζώνη ώρας).

/** Σημερινή ημερομηνία ως YYYY-MM-DD (local). */
export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA");
}

/** Προσθέτει/αφαιρεί ημέρες σε ένα YYYY-MM-DD. */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

/** Έλεγχος έγκυρης μορφής YYYY-MM-DD. */
export function isValidISODate(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Εμφανίσιμη ελληνική μορφή, π.χ. «Κυρ 15 Ιουνίου 2026». */
export function formatDateGreek(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("el-GR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Σύντομη μορφή «ΗΗ/ΜΜ». */
export function formatShortGreek(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "2-digit",
  });
}

/** Λίστα όλων των ημερών (YYYY-MM-DD) από from έως to (μέγιστο 400). */
export function eachDay(from: string, to: string): string[] {
  if (from > to) return [from];
  const days: string[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard < 400) {
    days.push(cur);
    cur = addDays(cur, 1);
    guard++;
  }
  return days;
}
