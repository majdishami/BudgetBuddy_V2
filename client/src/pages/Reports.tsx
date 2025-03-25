import React from 'react';
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DateRange } from "react-day-picker";
import { Card } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import DateRangePicker from "../components/ui/DateRangePicker"; // Updated import
import { Button } from "../components/ui/button";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import ReportModal from "../components/ReportModal";
import AnnualReportModal from "../components/AnnualReportModal";
import { startOfMonth, endOfMonth, isSameMonth, format, isValid } from "date-fns";
import type { Expense, Income, Category } from "@shared/schema"; // Ensure this file exists at the correct path or create it
type FilterType = "all-expenses" | "all-incomes" | "all-categories" | "single-expense" | "single-category";

// Report type title mapping
const getReportTypeTitle = (
  type: FilterType, 
  expenses: Expense[], 
  categories: Category[], 
  selectedExpenseId?: string,
  selectedCategoryId?: string
) => {
  switch (type) {
    case "all-expenses":
      return "All Expenses Report";
    case "all-incomes":
      return "All Incomes Report";
    case "all-categories":
      return "Category-wise Report";
    case "single-expense": {
      const expense = expenses?.find(e => e.id.toString() === selectedExpenseId);
      return `Expense Report - ${expense?.name || 'Selected Expense'}`;
    }
    case "single-category": {
      const category = categories?.find(c => c.id.toString() === selectedCategoryId);
      return `Category Report - ${category?.name || 'Selected Category'}`;
    }
    default:
      return "Financial Report";
  }
};

// Add the query configuration
const queryConfig = {
  staleTime: 30000, // 30 seconds
  refetchInterval: 30000 // 30 seconds
};

export default function Reports() {
  // Initialize with current month's range
  const now = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(now),
    to: endOfMonth(now)
  });

  const [reportType, setReportType] = useState<FilterType>("all-expenses");
  const [selectedExpense, setSelectedExpense] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [annualReportOpen, setAnnualReportOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Update the queries with the new configuration
  const { data: expenses, isLoading: loadingExpenses } = useQuery<Expense[]>({
    queryKey: ['/api/expenses'],
    ...queryConfig
  });

  const { data: incomes, isLoading: loadingIncomes } = useQuery<Income[]>({
    queryKey: ['/api/incomes'],
    ...queryConfig
  });

  const { data: categories, isLoading: loadingCategories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    ...queryConfig
  });

  const isLoading = loadingExpenses || loadingIncomes || loadingCategories;

  if (isLoading || !expenses || !incomes || !categories) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleDateRangeSelect = (range: DateRange) => {
    const from = range.from ? new Date(range.from) : undefined;
    const to = range.to ? new Date(range.to) : from;

    if (!from || !isValid(from) || !isValid(to)) return;

    setDateRange({ from, to });
  };

  const handleGenerateReport = () => {
    setIsGeneratingReport(true);
    setReportModalOpen(true);
  };

  const currentReportTitle = getReportTypeTitle(reportType, expenses, categories, selectedExpense, selectedCategory);

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold">Reports</h1>

      <Tabs defaultValue="date-range" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="date-range" className="flex-1">Date Range Report</TabsTrigger>
          <TabsTrigger value="annual" className="flex-1">Annual Report</TabsTrigger>
        </TabsList>

        <TabsContent value="date-range">
          <Card className="p-4 sm:p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="text-sm font-medium">Date Range</label>
                  <DateRangePicker onRangeSelect={handleDateRangeSelect} />
                  <div className="text-sm text-muted-foreground">
                    <span>{isSameMonth(dateRange.from!, dateRange.to!) ? 'Selected Month: ' : 'Selected Range: '}</span>
                    <span className="font-medium">
                      {format(dateRange.from!, isSameMonth(dateRange.from!, dateRange.to!) ? 'MMMM yyyy' : 'MMM dd, yyyy')}
                    </span>
                    {(!isSameMonth(dateRange.from!, dateRange.to!)) && (
                      <>
                        <span> to </span>
                        <span className="font-medium">
                          {format(dateRange.to!, 'MMM dd, yyyy')}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Report Type</label>
                      <Select value={reportType} onValueChange={(value) => {
                        setReportType(value as FilterType);
                        setSelectedExpense("");
                        setSelectedCategory("");
                      }}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select report type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-expenses">All Expenses Report</SelectItem>
                          <SelectItem value="all-incomes">All Incomes Report</SelectItem>
                          <SelectItem value="all-categories">Category-wise Report</SelectItem>
                          <SelectItem value="single-expense">Single Expense Report</SelectItem>
                          <SelectItem value="single-category">Category Report</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {reportType === "single-expense" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Select Expense</label>
                        <Select value={selectedExpense} onValueChange={setSelectedExpense}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select an expense" />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            className="max-h-[300px]"
                          >
                            {expenses?.map((expense) => (
                              <SelectItem key={expense.id} value={expense.id.toString()}>
                                {expense.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {reportType === "single-category" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Select Category</label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            className="max-h-[300px]"
                          >
                            {categories?.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGenerateReport}
                disabled={
                  isGeneratingReport ||
                  (reportType === "single-expense" && !selectedExpense) ||
                  (reportType === "single-category" && !selectedCategory)
                }
                className="w-full sm:w-auto"
              >
                {isGeneratingReport ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating {currentReportTitle}...
                  </>
                ) : (
                  `Generate ${currentReportTitle}`
                )}
              </Button>
            </div>
          </Card>

          {reportModalOpen && dateRange.from && dateRange.to && (
            <ReportModal
              open={reportModalOpen}
              onClose={() => {
                setReportModalOpen(false);
                setIsGeneratingReport(false);
              }}
              date={dateRange.from}
              endDate={dateRange.to}
              expenses={expenses}
              incomes={incomes}
              categories={categories}
              filterType={reportType}
              selectedExpenseId={selectedExpense}
              selectedCategoryId={selectedCategory}
            />
          )}
        </TabsContent>

        <TabsContent value="annual">
          <Card className="p-4 sm:p-6">
            <div className="space-y-4">
              <Button 
                onClick={() => setAnnualReportOpen(true)}
                className="w-full sm:w-auto"
              >
                Generate Annual Financial Report
              </Button>
            </div>
          </Card>

          {annualReportOpen && (
            <AnnualReportModal
              open={annualReportOpen}
              onClose={() => setAnnualReportOpen(false)}
              date={new Date()}
              expenses={expenses}
              incomes={incomes}
              title="Annual Financial Report"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}