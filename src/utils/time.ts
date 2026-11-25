import type {TranslationDictionary} from '../i18n/translations.ts';

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentMonthString(): string {
  return getTodayDateString().slice(0, 7);
}

export function getDurationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if (
    Number.isNaN(sh) ||
    Number.isNaN(sm) ||
    Number.isNaN(eh) ||
    Number.isNaN(em)
  ) {
    return 0;
  }
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : 0;
}

export function formatDuration(
  minutes: number,
  t: TranslationDictionary,
): string {
  if (minutes <= 0) {
    return `0 ${t.common.minutesShort}`;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) {
    return `${hrs} ${t.common.hoursShort} ${mins} ${t.common.minutesShort}`;
  }
  if (hrs > 0) {
    return `${hrs} ${t.common.hoursShort}`;
  }
  return `${mins} ${t.common.minutesShort}`;
}
