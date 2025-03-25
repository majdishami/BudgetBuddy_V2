import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Calendar from "../components/Calendar";
import MonthSummary from "../components/MonthSummary";
import ReportModal from "../components/ReportModal";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { FileText } from "lucide-react";
import type { Expense, Income, Category } from "@shared/schema"; // Adjust the path as needed

// The types are imported from "@shared/schema", so no need to redefine them here.

// Dynamic year calculation
const currentYear = new Date().getFullYear();
const yearRange = 3;
const years = Array.from(
  { length: yearRange * 2 + 1 },
  (_, i) => currentYear - yearRange + i
);

export const TODAY = new Date();

// Optimized query configuration
const queryConfig = {
  staleTime: 30000, // 30 seconds
  refetchInterval: 30000, // 30 seconds
  retry: 2
};

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [reportOpen, setReportOpen] = useState(false);

  const expensesQuery = useQuery<Expense[]>({
    queryKey: ['/api/expenses'],
    ...queryConfig
  });

  const incomesQuery = useQuery<Income[]>({
    queryKey: ['/api/incomes'],
    ...queryConfig
  });

  const categoriesQuery = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    ...queryConfig
  });

  const isLoading = expensesQuery.isLoading || incomesQuery.isLoading || categoriesQuery.isLoading;
  const hasError = expensesQuery.error || incomesQuery.error || categoriesQuery.error;
  const expenses = expensesQuery.data ?? [];
  const incomes = incomesQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

  const months = Array.from({ length: 12 }, (_, i) => new Date(0, i));

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading transactions...</div>;
  }

  if (hasError) {
    return <div className="text-red-500 p-4">Error loading transactions. Please try again.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Mobile-optimized header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8 p-4">
        <h1 className="text-2xl font-bold">Budget Dashboard</h1>

        {/* Date selectors - stack on mobile, row on desktop */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            value={selectedDate.getMonth().toString()}
            onValueChange={(value) => {
              const newDate = new Date(selectedDate);
              newDate.setMonth(parseInt(value));
              setSelectedDate(newDate);
            }}
          >
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[1000] bg-white rounded-md shadow-lg"> {/* Added z-[1000] and bg-white */}
              {months.map((month, i) => (
                <SelectItem key={i} value={i.toString()}>
                  {format(month, "MMMM")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedDate.getFullYear().toString()}
            onValueChange={(value) => {
              const newDate = new Date(selectedDate);
              newDate.setFullYear(parseInt(value));
              setSelectedDate(newDate);
            }}
          >
            <SelectTrigger className="w-full sm:w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[1000] bg-white rounded-md shadow-lg"> {/* Added z-[1000] and bg-white */}
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary and Report button - stack on mobile, align on desktop */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:ml-auto">
          <div className="w-full sm:w-auto">
            <MonthSummary 
              date={selectedDate}
              expenses={expenses}
              incomes={incomes}
            />
          </div>

          <Button 
            onClick={() => setReportOpen(true)} 
            className="w-full sm:w-auto whitespace-nowrap"
          >
            <FileText className="mr-2 h-4 w-4" />
            Monthly Budget
          </Button>
        </div>
      </div>

      {/* Calendar section */}
      <div className="px-4">
        <Calendar
          date={selectedDate}
          onDateChange={(date) => {
            if (date) setSelectedDate(date);
          }}
          expenses={expenses}
          incomes={incomes}
        />
      </div>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        date={selectedDate}
        endDate={selectedDate}
        expenses={expenses}
        incomes={incomes}
        categories={categories}
        filterType="all-expenses"
        isMonthlyBudget={true}
      />
    </div>
  );
}