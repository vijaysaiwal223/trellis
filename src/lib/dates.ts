import type { ISODate } from "@/features/renewal-risk/deadlines";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "3 Oct" */
export const dayMonth = (iso: ISODate) => {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
};

/** "3 Oct 2026" */
export const dayMonthYear = (iso: ISODate) => `${dayMonth(iso)} ${iso.slice(0, 4)}`;

/** "Sun 11 Oct" */
export const weekdayDayMonth = (iso: ISODate) => {
  const weekday = new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  return `${weekday} ${dayMonth(iso)}`;
};
