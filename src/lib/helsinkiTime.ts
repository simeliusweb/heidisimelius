/**
 * Gig dates and times are always shown in Helsinki time, whatever the visitor's (or
 * Google's renderer's) timezone is. Tokens: yyyy, MM, M, dd, d, HH, mm.
 */
const helsinkiParts = new Intl.DateTimeFormat("fi-FI", {
  timeZone: "Europe/Helsinki",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

export const formatHelsinki = (date: Date | string, pattern: string) => {
  const parts = Object.fromEntries(
    helsinkiParts.formatToParts(new Date(date)).map((p) => [p.type, p.value])
  );
  const n = (key: string) => Number(parts[key]);
  const pad = (value: number) => String(value).padStart(2, "0");
  const tokens: Record<string, string> = {
    yyyy: String(n("year")),
    MM: pad(n("month")),
    M: String(n("month")),
    dd: pad(n("day")),
    d: String(n("day")),
    HH: pad(n("hour")),
    mm: pad(n("minute")),
  };
  return pattern.replace(/yyyy|MM|M|dd|d|HH|mm/g, (token) => tokens[token]);
};
