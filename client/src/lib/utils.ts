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
  differenceInDays,
  subDays,
  endOfDay
} from "date-fns";
import { toZonedTime } from 'date-fns-tz';

// Type utilities
type Frequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY' | 'ONCE';

// Tailwind CSS class merging utility
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Currency formatting
export function formatCurrency(amount: number, withSymbol: boolean = false): string {
  return new Intl.NumberFormat('en-US', {
    style: withSymbol ? 'currency' : 'decimal',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Date validation helper
function ensureValidDate(date: Date | string | undefined, fallback: Date = new Date()): Date {
  if (!date) return new Date(fallback);
  
  const parsedDate = typeof date === 'string' ? parseISO(date) : new Date(date);
  
  if (!isValid(parsedDate)) {
    console.warn(`Invalid date provided: ${date}. Using fallback date.`);
    return new Date(fallback);
  }
  
  // Normalize time to noon UTC to avoid timezone issues
  return new Date(Date.UTC(
    parsedDate.getUTCFullYear(),
    parsedDate.getUTCMonth(),
    parsedDate.getUTCDate(),
    12, 0, 0
  ));
}

// Recurring date generator
export function getRecurringDates(
  startDate: Date | string | undefined,
  frequency: Frequency = 'ONCE',
  endDate: Date = new Date(2030, 11, 31)
): Date[] {
  try {
    const dates: Date[] = [];
    const start = ensureValidDate(startDate);
    const end = ensureValidDate(endDate);

    switch (frequency.toUpperCase()) {
      case 'DAILY':
        let dailyDate = new Date(start);
        while (dailyDate <= end) {
          dates.push(new Date(dailyDate));
          dailyDate = addDays(dailyDate, 1);
        }
        break;

      case 'WEEKLY':
        let weeklyDate = new Date(start);
        while (weeklyDate <= end) {
          dates.push(new Date(weeklyDate));
          weeklyDate = addDays(weeklyDate, 7);
        }
        break;

      case 'BIWEEKLY':
        let biweeklyDate = new Date(start);
        while (biweeklyDate <= end) {
          dates.push(new Date(biweeklyDate));
          biweeklyDate = addDays(biweeklyDate, 14);
        }
        break;

      case 'MONTHLY':
        let monthlyDate = startOfMonth(start);
        const dayOfMonth = getDate(start);

        while (monthlyDate <= end) {
          const daysInMonth = getDaysInMonth(monthlyDate);
          const actualDay = Math.min(dayOfMonth, daysInMonth);
          const recurringDate = new Date(
            monthlyDate.getFullYear(),
            monthlyDate.getMonth(),
            actualDay,
            12, 0, 0
          );

          if (recurringDate >= start && recurringDate <= end) {
            dates.push(recurringDate);
          }
          monthlyDate = addMonths(monthlyDate, 1);
        }
        break;

      case 'YEARLY':
        let yearlyDate = new Date(start);
        while (yearlyDate <= end) {
          dates.push(new Date(yearlyDate));
          yearlyDate = addYears(yearlyDate, 1);
        }
        break;

      case 'ONCE':
      default:
        dates.push(new Date(start));
    }

    return dates.sort((a, b) => a.getTime() - b.getTime());
  } catch (error) {
    console.error('Error generating recurring dates:', error);
    return [];
  }
}

// Date formatting for server (UTC)
export function formatDateForServer(date: Date | string): string {
  const validDate = ensureValidDate(date);
  return format(validDate, 'yyyy-MM-dd');
}

// Date formatting for display (local time)
export function formatDateForDisplay(date: Date | string): string {
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const validDate = ensureValidDate(date);
  const zonedDate = toZonedTime(validDate, userTimeZone);
  return format(zonedDate, 'MMM dd, yyyy');
}

// Date range utilities
export function isDateInRange(
  date: Date | string,
  start: Date | string,
  end: Date | string
): boolean {
  const d = ensureValidDate(date);
  const s = ensureValidDate(start);
  const e = ensureValidDate(end);
  return (isAfter(d, s) || isSameDay(d, s)) && 
         (isBefore(d, e) || isSameDay(d, e));
}

export function getDateRange(start: Date | string, end: Date | string): Date[] {
  const s = ensureValidDate(start);
  const e = ensureValidDate(end);
  const days = differenceInDays(e, s);
  return Array.from({ length: days + 1 }, (_, i) => addDays(s, i));
}

// Error handling utility
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
}

// Object utilities
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
}

// Async utilities
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}