import React from 'react';
import { Card } from "./ui/card";
import { formatCurrency, getRecurringDates } from "../lib/utils";
import { startOfMonth, endOfMonth, isWithinInterval, isBefore, parseISO, format, isValid } from "date-fns";
import type { Expense, Income } from "@shared/schema";

interface MonthSummaryProps {
  date: Date;
  expenses: Expense[];
  incomes: Income[];
}

export default function MonthSummary({ date, expenses, incomes }: MonthSummaryProps) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const interval = { start: monthStart, end: monthEnd };
  const today = new Date();

  // Create a map of transactions by date
  const monthTransactions = new Map<string, { incomes: Income[], expenses: Expense[] }>();

  // Process all incomes
  incomes.forEach(income => {
    try {
      // Provide default date if undefined
      const incomeDate = income.date ? (typeof income.date === 'string' ? parseISO(income.date) : income.date) : new Date();
      if (!isValid(incomeDate)) {
        console.warn('Invalid income date. Skipping income:', income);
        return; // Skip this income if the date is invalid
      }

      // Provide default frequency if undefined
      const incomeFrequency = income.frequency || 'ONCE';
      if (!income.frequency) {
        console.warn('Frequency is undefined for income. Defaulting to "ONCE". Income:', income);
      }

      const recurringDates = getRecurringDates(incomeDate, incomeFrequency, monthEnd)
        .filter(d => isWithinInterval(d, interval));

      recurringDates.forEach(recDate => {
        const dateKey = format(recDate, 'yyyy-MM-dd');
        if (!monthTransactions.has(dateKey)) {
          monthTransactions.set(dateKey, { incomes: [], expenses: [] });
        }
        monthTransactions.get(dateKey)!.incomes.push({ ...income, date: recDate.toISOString() });
      });
    } catch (error) {
      console.error("Error processing income:", error);
    }
  });

  // Process all expenses
  expenses.forEach(expense => {
    try {
      // Provide default date if undefined
      const expenseDate = expense.date ? (typeof expense.date === 'string' ? parseISO(expense.date) : expense.date) : new Date();
      if (!isValid(expenseDate)) {
        console.warn('Invalid expense date. Skipping expense:', expense);
        return; // Skip this expense if the date is invalid
      }

      // Provide default frequency if undefined
      const expenseFrequency = expense.frequency || 'ONCE';
      if (!expense.frequency) {
        console.warn('Frequency is undefined for expense. Defaulting to "ONCE". Expense:', expense);
      }

      const recurringDates = getRecurringDates(expenseDate, expenseFrequency, monthEnd)
        .filter(d => isWithinInterval(d, interval));

      recurringDates.forEach(recDate => {
        const dateKey = format(recDate, 'yyyy-MM-dd');
        if (!monthTransactions.has(dateKey)) {
          monthTransactions.set(dateKey, { incomes: [], expenses: [] });
        }
        monthTransactions.get(dateKey)!.expenses.push({ ...expense, date: recDate.toISOString() });
      });
    } catch (error) {
      console.error("Error processing expense:", error);
    }
  });

  // Calculate totals
  let totalIncurredIncomes = 0;
  let totalPendingIncomes = 0;
  let totalIncurredExpenses = 0;
  let totalPendingExpenses = 0;

  Array.from(monthTransactions.entries()).forEach(([dateKey, transactions]) => {
    const transactionDate = parseISO(dateKey);
    const isPending = !isBefore(transactionDate, today);

    transactions.incomes.forEach(income => {
      const amount = Number(income.amount);
      if (isPending) {
        totalPendingIncomes += amount;
      } else {
        totalIncurredIncomes += amount;
      }
    });

    transactions.expenses.forEach(expense => {
      const amount = Number(expense.amount);
      if (isPending) {
        totalPendingExpenses += amount;
      } else {
        totalIncurredExpenses += amount;
      }
    });
  });

  const totalIncomes = totalIncurredIncomes + totalPendingIncomes;
  const totalExpenses = totalIncurredExpenses + totalPendingExpenses;

  return (
    <div className="flex gap-4 flex-1">
      <Card className="py-1.5 px-3 flex-1 flex items-center justify-between">
        <div>
          <h3 className="text-[11px] font-medium text-muted-foreground">Income</h3>
          <p className="text-sm font-bold text-green-500">
            {formatCurrency(totalIncomes)}
          </p>
        </div>
        <div className="text-[10px] leading-tight text-right">
          <p className="text-green-600">
            <span className="text-muted-foreground">Occurred:</span> {formatCurrency(totalIncurredIncomes)}
          </p>
          <p className="text-green-600/70">
            <span className="text-muted-foreground">Pending:</span> {formatCurrency(totalPendingIncomes)}
          </p>
        </div>
      </Card>

      <Card className="py-1.5 px-3 flex-1 flex items-center justify-between">
        <div>
          <h3 className="text-[11px] font-medium text-muted-foreground">Expenses</h3>
          <p className="text-sm font-bold text-red-500">
            {formatCurrency(totalExpenses)}
          </p>
        </div>
        <div className="text-[10px] leading-tight text-right">
          <p className="text-red-500">
            <span className="text-muted-foreground">Occurred:</span> {formatCurrency(totalIncurredExpenses)}
          </p>
          <p className="text-red-500/70">
            <span className="text-muted-foreground">Pending:</span> {formatCurrency(totalPendingExpenses)}
          </p>
        </div>
      </Card>

      <Card className="py-1.5 px-3 flex-1 flex items-center justify-between">
        <div>
          <h3 className="text-[11px] font-medium text-muted-foreground">Balance</h3>
          <p className="text-sm font-bold text-blue-500">
            {formatCurrency(totalIncomes - totalExpenses)}
          </p>
        </div>
        <div className="text-[10px] leading-tight text-right">
          <p className="text-blue-500">
            <span className="text-muted-foreground">Occurred:</span> {formatCurrency(totalIncurredIncomes - totalIncurredExpenses)}
          </p>
          <p className="text-blue-500/70">
            <span className="text-muted-foreground">Pending:</span> {formatCurrency(totalPendingIncomes - totalPendingExpenses)}
          </p>
        </div>
      </Card>
    </div>
  );
}