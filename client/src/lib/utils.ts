import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { addMonths, addYears, format, parseISO, startOfMonth, isValid, getDate, getDaysInMonth, addDays } from "date-fns";
import { toZonedTime } from 'date-fns-tz';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function ensureValidDate(date: Date | string | undefined): Date {
  if (!date) {
    console.warn('Date is undefined. Falling back to current date.');
    return new Date(); // Fallback to current date
  }

  if (typeof date === 'string') {
    const parsedDate = parseISO(date);
    if (!isValid(parsedDate)) {
      console.warn('Invalid date string provided. Falling back to current date.');
      return new Date(); // Fallback to current date
    }
    return new Date(Date.UTC(
      parsedDate.getUTCFullYear(),
      parsedDate.getUTCMonth(),
      parsedDate.getUTCDate(),
      12, 0, 0
    ));
  }

  if (!isValid(date)) {
    console.warn('Invalid date object provided. Falling back to current date.');
    return new Date(); // Fallback to current date
  }

  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    12, 0, 0
  ));
}

export function getRecurringDates(
  startDate: Date | string | undefined,
  frequency: string | undefined,
  endDate: Date = new Date(2030, 11, 31)
): Date[] {
  try {
    const dates: Date[] = [];
    const start = ensureValidDate(startDate);
    const end = ensureValidDate(endDate);

    // Validate frequency
    if (!frequency) {
      console.warn('Frequency is undefined. Defaulting to "ONCE".');
      frequency = 'ONCE';
    }

    const normalizedFrequency = frequency.toUpperCase();
    console.log('Getting recurring dates:', {
      start: start.toISOString(),
      end: end.toISOString(),
      frequency: normalizedFrequency
    });

    switch (normalizedFrequency) {
      case 'BIWEEKLY': {
        let currentDate = new Date(start);
        while (currentDate <= end) {
          if (currentDate >= start) {
            dates.push(new Date(Date.UTC(
              currentDate.getUTCFullYear(),
              currentDate.getUTCMonth(),
              currentDate.getUTCDate(),
              12, 0, 0
            )));
          }
          // Add 14 days for bi-weekly frequency
          currentDate = addDays(currentDate, 14);
        }
        break;
      }

      case 'MONTHLY': {
        let currentDate = startOfMonth(start);
        const dayOfMonth = getDate(start);

        while (currentDate <= end) {
          const daysInMonth = getDaysInMonth(currentDate);
          const actualDay = Math.min(dayOfMonth, daysInMonth);
          const recurringDate = new Date(Date.UTC(
            currentDate.getUTCFullYear(),
            currentDate.getUTCMonth(),
            actualDay,
            12, 0, 0
          ));

          if (recurringDate >= start && recurringDate <= end) {
            dates.push(new Date(recurringDate));
          }

          currentDate = addMonths(currentDate, 1);
        }
        break;
      }

      case 'YEARLY': {
        let currentYear = start;
        while (currentYear <= end) {
          if (currentYear >= start) {
            dates.push(new Date(Date.UTC(
              currentYear.getUTCFullYear(),
              currentYear.getUTCMonth(),
              currentYear.getUTCDate(),
              12, 0, 0
            )));
          }
          currentYear = addYears(currentYear, 1);
        }
        break;
      }

      case 'ONCE':
      default:
        dates.push(new Date(Date.UTC(
          start.getUTCFullYear(),
          start.getUTCMonth(),
          start.getUTCDate(),
          12, 0, 0
        )));
    }

    console.log('Generated dates:', dates.map(d => d.toISOString()));
    return dates.sort((a, b) => a.getTime() - b.getTime());
  } catch (error) {
    console.error('Error in getRecurringDates:', error);
    return [];
  }
}

export function formatDateForServer(date: Date | string): string {
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (typeof date === 'string') {
    date = parseISO(date);
  }

  // Convert to UTC noon to avoid timezone edge cases
  const utcDate = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    12, 0, 0
  ));

  // Format date as YYYY-MM-DD using the local timezone components
  const localDate = toZonedTime(utcDate, userTimeZone);
  const formattedDate = format(localDate, 'yyyy-MM-dd');

  return formattedDate;
}

export function formatDateForDisplay(date: Date | string): string {
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (typeof date === 'string') {
    date = parseISO(date);
  }

  // Convert to UTC noon to avoid timezone edge cases
  const utcDate = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    12, 0, 0
  ));

  // Convert to local timezone for display
  const localDate = toZonedTime(utcDate, userTimeZone);
  const displayDate = format(localDate, 'MMM dd, yyyy');

  return displayDate;
}