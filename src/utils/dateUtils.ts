export const addMonthsPreservingDay = (date: Date | string, monthsToAdd: number, originalDay?: number): Date => {
  const baseDate = typeof date === 'string' ? new Date(date) : new Date(date);

  const dayToPreserve = originalDay !== undefined ? originalDay : baseDate.getDate();
  const originalMonth = baseDate.getMonth();
  const originalYear = baseDate.getFullYear();

  const targetMonth = originalMonth + monthsToAdd;
  const targetYear = originalYear + Math.floor(targetMonth / 12);
  const adjustedMonth = ((targetMonth % 12) + 12) % 12;

  const lastDayOfTargetMonth = new Date(targetYear, adjustedMonth + 1, 0).getDate();

  const finalDay = Math.min(dayToPreserve, lastDayOfTargetMonth);

  return new Date(targetYear, adjustedMonth, finalDay);
};

export const getLastDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export const isDayValidForMonth = (day: number, year: number, month: number): boolean => {
  const lastDay = getLastDayOfMonth(year, month);
  return day >= 1 && day <= lastDay;
};

export const formatDateToISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDateAdjustmentInfo = (
  originalDay: number,
  targetDate: Date
): { wasAdjusted: boolean; adjustedFrom: number; adjustedTo: number } => {
  const finalDay = targetDate.getDate();
  const wasAdjusted = originalDay !== finalDay;

  return {
    wasAdjusted,
    adjustedFrom: originalDay,
    adjustedTo: finalDay
  };
};

export const generateInstallmentDates = (
  startDate: string,
  numberOfInstallments: number
): Array<{ installmentNumber: number; date: string; wasAdjusted: boolean; originalDay: number }> => {
  const dates: Array<{ installmentNumber: number; date: string; wasAdjusted: boolean; originalDay: number }> = [];
  const baseDate = new Date(startDate);
  const originalDay = baseDate.getDate();

  for (let i = 0; i < numberOfInstallments; i++) {
    const installmentDate = addMonthsPreservingDay(startDate, i, originalDay);
    const adjustmentInfo = getDateAdjustmentInfo(originalDay, installmentDate);

    dates.push({
      installmentNumber: i + 1,
      date: formatDateToISO(installmentDate),
      wasAdjusted: adjustmentInfo.wasAdjusted,
      originalDay
    });
  }

  return dates;
};
