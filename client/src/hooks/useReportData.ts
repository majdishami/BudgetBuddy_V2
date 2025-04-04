import { useMemo } from 'react';
import { 
  isWithinInterval, 
  isBefore, 
  startOfMonth, 
  endOfMonth, 
  isSameMonth,
  parseISO,
  isValid 
} from 'date-fns';
import { getRecurringDates, Frequency } from '../lib/utils';

interface Expense {
  id: string;
  date: string | Date;
  amount: string;
  frequency: Frequency;
  categoryId: string;
}

interface Income {
  id: string;
  date: string | Date;
  amount: string;
  frequency: Frequency;
}

interface Category {
  id: string;
  name: string;
}
const ensureValidDate = (date: Date | string | undefined): Date => {
  try {
    if (!date) {
      console.warn('Date is undefined. Falling back to current date.');
      return new Date();
    }
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsedDate)) {
      console.warn('Invalid date. Falling back to current date.');
      return new Date();
    }
    return parsedDate;
  } catch (error) {
    console.error('Error parsing date:', error);
    return new Date();
  }
};

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const useReportData = (
  expenses: Expense[],
  incomes: Income[],
  date: Date | string | undefined,
  endDate: Date | string | undefined,
  filterType: string,
  selectedExpenseId: string | undefined,
  selectedCategoryId: string | undefined,
  isMonthlyBudget: boolean,
  categories: Category[]
) => {
  const startDate = ensureValidDate(date);
  const endingDate = ensureValidDate(endDate);
  const isMonthlyView = isSameMonth(startDate, endingDate);
  const generationDate = new Date();

  const interval = isMonthlyView
    ? { start: startOfMonth(startDate), end: endOfMonth(startDate) }
    : { start: startDate, end: endingDate };

  const processedIncomes = useMemo(() => {
    return (isMonthlyBudget || filterType === "all-incomes") ? incomes.map(income => {
      try {
        const incomeDate = ensureValidDate(income.date);
        const dates = getRecurringDates(incomeDate, income.frequency, interval.end)
          .filter(d => isWithinInterval(d, interval))
          .map(d => ({
            date: d,
            isPending: !isBefore(d, generationDate),
            amount: Number(income.amount)
          }));

        const incurredAmount = dates.reduce((sum, date) => sum + (date.isPending ? 0 : date.amount), 0);
        const pendingAmount = dates.reduce((sum, date) => sum + (date.isPending ? date.amount : 0), 0);

        return {
          ...income,
          amount: Number(income.amount),
          dates,
          incurredAmount,
          pendingAmount,
          totalAmount: incurredAmount + pendingAmount
        };
      } catch (error) {
        console.error("Error processing recurring income dates:", error);
        return {
          ...income,
          amount: Number(income.amount),
          dates: [],
          incurredAmount: 0,
          pendingAmount: 0,
          totalAmount: 0
        };
      }
    }).filter(income => income.dates.length > 0) : [];
  }, [incomes, filterType, isMonthlyBudget, interval, generationDate]);

  const processedExpenses = useMemo(() => {
    return expenses
      .filter(expense => {
        if (filterType === "single-expense") {
          return expense.id.toString() === selectedExpenseId;
        }
        if (filterType === "single-category") {
          return expense.categoryId.toString() === selectedCategoryId;
        }
        return true;
      })
      .map(expense => {
        try {
          const expenseDate = ensureValidDate(expense.date);
          const dates = getRecurringDates(expenseDate, expense.frequency, interval.end)
            .filter(d => isWithinInterval(d, interval))
            .map(d => ({
              date: d,
              isPending: !isBefore(d, generationDate),
              amount: Number(expense.amount)
            }));

          const incurredAmount = dates.reduce((sum, date) => sum + (date.isPending ? 0 : date.amount), 0);
          const pendingAmount = dates.reduce((sum, date) => sum + (date.isPending ? date.amount : 0), 0);

          return {
            ...expense,
            amount: Number(expense.amount),
            dates,
            incurredAmount,
            pendingAmount,
            totalAmount: incurredAmount + pendingAmount
          };
        } catch (error) {
          console.error("Error processing recurring expense dates:", error);
          return {
            ...expense,
            amount: Number(expense.amount),
            dates: [],
            incurredAmount: 0,
            pendingAmount: 0,
            totalAmount: 0
          };
        }
      }).filter(expense => expense.dates.length > 0);
  }, [expenses, filterType, selectedExpenseId, selectedCategoryId, interval, generationDate]);

  const totalIncurredIncomes = useMemo(() => processedIncomes.reduce((sum, inc) => sum + inc.incurredAmount, 0), [processedIncomes]);
  const totalPendingIncomes = useMemo(() => processedIncomes.reduce((sum, inc) => sum + inc.pendingAmount, 0), [processedIncomes]);
  const totalIncomes = totalIncurredIncomes + totalPendingIncomes;

  const totalIncurredExpenses = useMemo(() => processedExpenses.reduce((sum, exp) => sum + exp.incurredAmount, 0), [processedExpenses]);
  const totalPendingExpenses = useMemo(() => processedExpenses.reduce((sum, exp) => sum + exp.pendingAmount, 0), [processedExpenses]);
  const totalExpenses = totalIncurredExpenses + totalPendingExpenses;

  const groupedExpenses = useMemo(() => {
    if (filterType === "all-categories") {
      return categories.map(category => {
        const categoryExpenses = processedExpenses.filter(expense => expense.categoryId === category.id);
        const totalAmount = categoryExpenses.reduce((sum, exp) => sum + exp.totalAmount, 0);
        const incurredAmount = categoryExpenses.reduce((sum, exp) => sum + exp.incurredAmount, 0);
        const pendingAmount = categoryExpenses.reduce((sum, exp) => sum + exp.pendingAmount, 0);

        return {
          category,
          expenses: categoryExpenses,
          totalAmount,
          incurredAmount,
          pendingAmount
        };
      }).filter(group => group.expenses.length > 0)
        .sort((a, b) => b.totalAmount - a.totalAmount);
    }
    return [];
  }, [processedExpenses, categories, filterType]);

  
  return {
    processedIncomes,
    processedExpenses,
    totalIncurredIncomes,
    totalPendingIncomes,
    totalIncomes,
    totalIncurredExpenses,
    totalPendingExpenses,
    totalExpenses,
    groupedExpenses
  };
};

export default useReportData;