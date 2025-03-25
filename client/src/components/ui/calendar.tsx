import React from 'react';
import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  parseISO,
  isWithinInterval,
  isSameDay,
  isBefore
} from "date-fns";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { formatCurrency, getRecurringDates } from "../../lib/utils";
import DaySummary from "../DaySummary";
import type { Expense, Income } from "@shared/schema";
import { TODAY } from "../../pages/Dashboard";

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface CalendarProps {
  date?: Date;
  onDateChange?: (date: Date | null) => void;
  dateRange?: DateRange;
  onRangeSelect?: (range: DateRange | undefined) => void;
  expenses?: Expense[];
  incomes?: Income[];
  fromYear?: number;
  toYear?: number;
  className?: string;
}

export default function Calendar({
  date = TODAY,
  onDateChange,
  dateRange,
  onRangeSelect,
  expenses = [],
  incomes = [],
  className
}: CalendarProps) {
  const minimumDate = new Date('2025-01-01');
  const activeDate = isBefore(date ?? TODAY, minimumDate) ? minimumDate : date;
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const days = useMemo(() => {
    const monthStart = startOfMonth(activeDate);
    const monthEnd = endOfMonth(activeDate);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [activeDate]);

  const transactionsByDate = useMemo(() => {
    const dateMap = new Map<string, { expenses: Expense[]; incomes: Income[] }>();
    days.forEach(day => {
      dateMap.set(format(day, "yyyy-MM-dd"), { expenses: [], incomes: [] });
    });

    incomes.forEach(income => {
      const incomeDate = typeof income.date === "string" ? parseISO(income.date) : income.date;
      const recurringDates = getRecurringDates(incomeDate, income.frequency, endOfMonth(activeDate))
        .filter((d: Date) => isWithinInterval(d, { start: startOfMonth(activeDate), end: endOfMonth(activeDate) }));

      recurringDates.forEach((date: Date) => {
        const key = format(date, "yyyy-MM-dd");
        if (dateMap.has(key)) {
          dateMap.get(key)!.incomes.push({ ...income, date: date.toISOString() });
        }
      });
    });

    expenses.forEach(expense => {
      const expenseDate = typeof expense.date === "string" ? parseISO(expense.date) : expense.date;
      const recurringDates = getRecurringDates(expenseDate, expense.frequency, endOfMonth(activeDate))
        .filter((d: Date) => isWithinInterval(d, { start: startOfMonth(activeDate), end: endOfMonth(activeDate) }));

      recurringDates.forEach((date: Date) => {
        const key = format(date, "yyyy-MM-dd");
        if (dateMap.has(key)) {
          dateMap.get(key)!.expenses.push({ ...expense, date: date.toISOString() });
        }
      });
    });

    return dateMap;
  }, [activeDate, expenses, incomes, days]);

  const handleClick = (day: Date) => {
    if (isBefore(day, minimumDate)) return; // Prevent selection before January 1, 2025

    if (onDateChange) {
      onDateChange(day);
    } else if (onRangeSelect) {
      if (!dateRange?.start || (dateRange.start && dateRange.end)) {
        onRangeSelect({ start: day, end: null });
      } else {
        const endDate = day < dateRange.start ? dateRange.start : day;
        onRangeSelect({ start: dateRange.start, end: endDate });
      }
    }

    setSelectedDay(day);
  };

  return (
    <>
      <Card className={`p-6 ${className}`}>
        <div className="grid grid-cols-7 gap-px border border-border rounded-lg overflow-hidden">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-3 text-center font-medium bg-muted border-b border-r border-border">
              {day}
            </div>
          ))}

          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayTransactions = transactionsByDate.get(dateKey) || { expenses: [], incomes: [] };
            const isToday = isSameDay(day, TODAY);

            const isInRange = dateRange?.start && dateRange?.end
              ? isWithinInterval(day, { start: dateRange.start, end: dateRange.end })
              : false;

            const isSelected = isSameDay(day, date ?? dateRange?.start ?? TODAY);

            return (
              <Button
                key={dateKey}
                variant="ghost"
                className={`h-auto min-h-[120px] p-3 text-left border-b border-r border-border flex flex-col items-start justify-start hover:bg-accent relative ${
                  isToday ? "bg-yellow-50" : ""
                } ${isSelected ? "bg-accent" : ""} ${isInRange ? "bg-muted" : ""}`}
                onClick={() => handleClick(day)}
                disabled={isBefore(day, minimumDate)} // Disable days before January 1, 2025
              >
                <div className={`flex items-center gap-2 mb-2 ${
                  isToday ? "font-bold text-yellow-900" : ""
                }`}>
                  <span className="font-medium">{format(day, "d")}</span>
                  <span className="text-xs text-muted-foreground">{format(day, "EEE")}</span>
                </div>

                <div className="w-full space-y-1">
                  {dayTransactions.incomes.map((income, idx) => (
                    <div key={`${income.id}-${idx}`} className="text-green-500 text-sm font-medium flex justify-between items-center">
                      <span className="truncate flex-1">{income.name}</span>
                      <span>{formatCurrency(Number(income.amount))}</span>
                    </div>
                  ))}
                  {dayTransactions.expenses.map((expense, idx) => (
                    <div key={`${expense.id}-${idx}`} className="text-red-500 text-sm font-medium flex justify-between items-center">
                      <span className="truncate flex-1">{expense.name}</span>
                      <span>{formatCurrency(Number(expense.amount))}</span>
                    </div>
                  ))}
                </div>
              </Button>
            );
          })}
        </div>
      </Card>

      {selectedDay && (
        <DaySummary
          open={selectedDay !== null}
          onClose={() => setSelectedDay(null)}
          date={selectedDay}
          expenses={expenses}
          incomes={incomes}
        />
      )}
    </>
  );
}