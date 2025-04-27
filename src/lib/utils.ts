import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date) {
  return Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export function readingTime(html: string) {
  const textOnly = html.replace(/<[^>]+>/g, "");
  const wordCount = textOnly.split(/\s+/).length;
  const readingTimeMinutes = (wordCount / 200 + 1).toFixed();
  return `${readingTimeMinutes} min read`;
}

export function dateRange(
  startDate: Date,
  endDate?: Date | string,
  { showPeriod = false }: { showPeriod?: boolean } = {}
): string {
  const formatDate = (date: Date): string =>
    `${date.toLocaleString("default", { month: "short" })}${date.getFullYear()}`;

  const calculateExperienceText = (start: Date): string => {
    const today = new Date();
    const anniversaryThisYear = new Date(
      today.getFullYear(),
      start.getMonth(),
      start.getDate()
    );

    const years =
      today.getFullYear() -
      start.getFullYear() -
      (today >= anniversaryThisYear ? 0 : 1);

    const isAnniversaryToday =
      today.getMonth() === start.getMonth() &&
      today.getDate() === start.getDate();

    return years < 1 ? "<1" : isAnniversaryToday ? `${years}` : `${years}+`;
  };

  const startLabel = formatDate(startDate);
  const endLabel = !endDate
    ? ""
    : typeof endDate === "string"
      ? endDate
      : formatDate(endDate);

  let result = `${startLabel} - ${endLabel}`;

  if (showPeriod && endDate === "Current") {
    result += ` (${calculateExperienceText(startDate)} years)`;
  }

  return result;
}
