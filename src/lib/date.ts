function formatDate(date: Date): string {
  return `${date.toLocaleString("default", { month: "short" })}${date.getFullYear()}`;
}

export function dateRange(
  startDate: Date,
  endDate?: Date | string,
  { showPeriod = false }: { showPeriod?: boolean } = {}
): string {
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
