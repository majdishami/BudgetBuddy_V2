import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  addMonths, 
  addYears, 
  format, 
  parseISO, 
  startOfMonth, 
  isValid, 
  getDate, 
  getDaysInMonth, 
  addDays,
  isBefore,
  isSameDay,
  isAfter,
  differenceInDays
} from "date-fns";
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
    return new Date();
  }

  if (typeof date === 'string') {
    const parsedDate = parseISO(date);
    if (!isValid(parsedDate)) {
      console.warn('Invalid date string provided. Falling back to current date.');
      return new Date();
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
    return new Date();
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

    if (!frequency) {
      console.warn('Frequency is undefined. Defaulting to "ONCE".');
      frequency = 'ONCE';
    }

    const normalizedFrequency = frequency.toUpperCase();
    
    switch (normalizedFrequency) {
      case 'BIWEEKLY': {
        let currentDate = new Date(start);
        while (currentDate <= end) {
          if (currentDate >= start) {
            dates.push(new Date(currentDate));
          }
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
          const recurringDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            actualDay,
            12, 0, 0
          );

          if (recurringDate >= start && recurringDate <= end) {
            dates.push(recurringDate);
          }

          currentDate = addMonths(currentDate, 1);
        }
        break;
      }

      case 'YEARLY': {
        let currentYear = new Date(start);
        while (currentYear <= end) {
          if (currentYear >= start) {
            dates.push(new Date(currentYear));
          }
          currentYear = addYears(currentYear, 1);
        }
        break;
      }

      case 'ONCE':
      default:
        dates.push(new Date(start));
    }

    return dates.sort((a: Date, b: Date) => a.getTime() - b.getTime());
  } catch (error) {
    console.error('Error in getRecurringDates:', error);
    return [];
  }
}

export function formatDateForServer(date: Date | string): string {
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const parsedDate = typeof date === 'string' ? parseISO(date) : new Date(date);
  
  const utcDate = new Date(Date.UTC(
    parsedDate.getUTCFullYear(),
    parsedDate.getUTCMonth(),
    parsedDate.getUTCDate(),
    12, 0, 0
  ));

  const localDate = toZonedTime(utcDate, userTimeZone);
  return format(localDate, 'yyyy-MM-dd');
}

export function formatDateForDisplay(date: Date | string): string {
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const parsedDate = typeof date === 'string' ? parseISO(date) : new Date(date);
  
  const utcDate = new Date(Date.UTC(
    parsedDate.getUTCFullYear(),
    parsedDate.getUTCMonth(),
    parsedDate.getUTCDate(),
    12, 0, 0
  ));

  const localDate = toZonedTime(utcDate, userTimeZone);
  return format(localDate, 'MMM dd, yyyy');
}