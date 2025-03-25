import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { formatCurrency, getRecurringDates } from "../lib/utils";
import { isWithinInterval, format, parseISO, startOfMonth, endOfMonth, isSameMonth, isBefore, isValid } from "date-fns";
import { Button } from "./ui/button";
import { Download } from "lucide-react";
import type { Expense, Income, Category } from "@shared/schema";
import { Separator } from "./ui/separator";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

// Helper function to validate and parse dates
// Helper function to validate and parse dates
function ensureValidDate(date: Date | string | undefined): Date {
  try {
    if (!date) {
      console.warn('Date is undefined. Falling back to current date.');
      return new Date(); // Fallback to current date
    }
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsedDate)) {
      console.warn('Invalid date. Falling back to current date.');
      return new Date(); // Fallback to current date
    }
    return parsedDate;
  } catch (error) {
    console.error('Error parsing date:', error);
    return new Date(); // Fallback to current date
  }
}

// Helper function to convert hex to RGB
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

type FilterType = "all-expenses" | "all-incomes" | "all-categories" | "single-expense" | "single-category";

interface CategoryGroup {
  category: Category;
  expenses: ProcessedExpense[];
  totalAmount: number;
  incurredAmount: number;
  pendingAmount: number;
}

interface ProcessedExpense extends Expense {
  dates: { date: Date; isPending: boolean; amount: number }[];
  incurredAmount: number;
  pendingAmount: number;
  totalAmount: number;
}

interface ProcessedIncome extends Income {
  dates: { date: Date; isPending: boolean; amount: number }[];
  incurredAmount: number;
  pendingAmount: number;
  totalAmount: number;
}

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  date: Date;
  endDate: Date;
  expenses: Expense[];
  incomes: Income[];
  categories: Category[];
  filterType: FilterType;
  selectedExpenseId?: string;
  selectedCategoryId?: string;
  isMonthlyBudget?: boolean;
}

const addTableHeader = (doc: jsPDF, headers: string[], y: number, options: {
  bgColor?: string;
  textColor?: string;
} = {}): number => {
  const { bgColor = '#f8fafc', textColor = '#0f172a' } = options;
  const rgb = hexToRgb(bgColor);
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.rect(15, y - 5, 180, 10, 'F');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(textColor);

  const colWidth = 180 / headers.length;
  headers.forEach((header, index) => {
    const x = 15 + (index * colWidth);
    const align = index === 0 ? "left" : "right";
    doc.text(header, align === "left" ? x + 2 : x + colWidth - 2, y, { align });
  });

  return y + 10;
};

const addTableRow = (doc: jsPDF, data: string[], y: number, options: {
  isAlternate?: boolean;
  color?: string;
  isPending?: boolean;
} = {}): number => {
  const { isAlternate = false, color = "#334155", isPending = false } = options;

  if (isAlternate) {
    doc.setFillColor(250, 250, 250);
    doc.rect(15, y - 5, 180, 8, 'F');
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  // Set text color with opacity for pending entries
  if (color) {
    const rgb = hexToRgb(color);
    doc.setTextColor(rgb.r, rgb.g, rgb.b, isPending ? 0.6 : 1); // 60% opacity for pending
  }

  const colWidth = 180 / data.length;
  data.forEach((cell, index) => {
    const x = 15 + (index * colWidth);
    const align = index === 0 ? "left" : "right";
    doc.text(cell, align === "left" ? x + 2 : x + colWidth - 2, y, { align });
  });

  return y + 8;
};

export default function ReportModal({
  open,
  onClose,
  date,
  endDate,
  expenses,
  incomes,
  categories,
  filterType,
  selectedExpenseId,
  selectedCategoryId,
  isMonthlyBudget = false,
}: ReportModalProps) {
  const startDate = ensureValidDate(date);
  const endingDate = ensureValidDate(endDate);
  const isMonthlyView = isSameMonth(startDate, endingDate);
  const generationDate = new Date();

  const interval = isMonthlyView
    ? { start: startOfMonth(startDate), end: endOfMonth(startDate) }
    : { start: startDate, end: endingDate };

  // Process incomes only for Monthly Budget and All Incomes report
  const processedIncomes = (isMonthlyBudget || filterType === "all-incomes") ? incomes.map(income => {
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
        dates,
        incurredAmount,
        pendingAmount,
        totalAmount: incurredAmount + pendingAmount
      };
    } catch (error) {
      console.error("Error processing recurring income dates:", error);
      return {
        ...income,
        dates: [],
        incurredAmount: 0,
        pendingAmount: 0,
        totalAmount: 0
      };
    }
  }).filter(income => income.dates.length > 0) : [];

  // Process expenses
  const processedExpenses = expenses
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
          dates,
          incurredAmount,
          pendingAmount,
          totalAmount: incurredAmount + pendingAmount
        };
      } catch (error) {
        console.error("Error processing recurring expense dates:", error);
        return {
          ...expense,
          dates: [],
          incurredAmount: 0,
          pendingAmount: 0,
          totalAmount: 0
        };
      }
    }).filter(expense => expense.dates.length > 0);

  // Calculate totals
  const totalIncurredIncomes = processedIncomes.reduce((sum, inc) => sum + inc.incurredAmount, 0);
  const totalPendingIncomes = processedIncomes.reduce((sum, inc) => sum + inc.pendingAmount, 0);
  const totalIncomes = totalIncurredIncomes + totalPendingIncomes;

  const totalIncurredExpenses = processedExpenses.reduce((sum, exp) => sum + exp.incurredAmount, 0);
  const totalPendingExpenses = processedExpenses.reduce((sum, exp) => sum + exp.pendingAmount, 0);
  const totalExpenses = totalIncurredExpenses + totalPendingExpenses;

  // Get selected category for single category view
  const selectedCategoryDetails = filterType === "single-category"
    ? categories.find(c => c.id.toString() === selectedCategoryId)
    : null;

  // Group expenses by category for the category-wise report
  const groupExpensesByCategory = (expenses: ProcessedExpense[], categories: Category[]): CategoryGroup[] => {
    return categories.map(category => {
      const categoryExpenses = expenses.filter(expense => expense.categoryId === category.id);
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
  };

  const groupedExpenses = filterType === "all-categories"
    ? groupExpensesByCategory(processedExpenses, categories)
    : [];

  // Get report title
  const getReportTitle = () => {
    if (isMonthlyBudget) {
      return "Monthly Budget";
    }

    switch (filterType) {
      case "all-expenses":
        return "All Expenses Report";
      case "all-incomes":
        return "All Incomes Report";
      case "all-categories":
        return "Category-wise Report";
      case "single-expense": {
        const expense = expenses.find(e => e.id.toString() === selectedExpenseId);
        return `Single Expense Report - ${expense?.name}`;
      }
      case "single-category": {
        return `Category Report - ${selectedCategoryDetails?.name}`;
      }
      default:
        return "Budget Report";
    }
  };

  const handlePDFDownload = () => {
    const doc = new jsPDF();
    let y = 25;

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor("#0f172a");
    doc.text(getReportTitle(), 15, y);
    y += 10;

    // Subtitle with date range
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor("#475569");
    const dateRange = isMonthlyBudget
      ? `${format(startOfMonth(startDate), 'MMMM dd, yyyy')} - ${format(endOfMonth(startDate), 'MMMM dd, yyyy')}`
      : `${format(startDate, 'MMMM dd, yyyy')} - ${format(endingDate, 'MMMM dd, yyyy')}`;
    doc.text(dateRange, 15, y);
    y += 8;

    // Generation date
    doc.setFontSize(10);
    doc.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy')}`, 15, y);
    y += 20;

    // Summary Section
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y - 5, 180, 10, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor("#0f172a");
    doc.text("Summary", 15, y);
    y += 15;

    // Summary Table
    const summaryHeaders = ["Category", "Total", "Occurred", "Pending"];
    y = addTableHeader(doc, summaryHeaders, y);

    if (isMonthlyBudget || filterType === "all-incomes") {
      y = addTableRow(doc, [
        "Income",
        formatCurrency(totalIncomes),
        formatCurrency(totalIncurredIncomes),
        formatCurrency(totalPendingIncomes)
      ], y, {
        color: "#047857" // green color for income
      });
    }

    y = addTableRow(doc, [
      filterType === "single-category" ? selectedCategoryDetails?.name || "Expenses" : "Expenses",
      formatCurrency(totalExpenses),
      formatCurrency(totalIncurredExpenses),
      formatCurrency(totalPendingExpenses)
    ], y, {
      color: filterType === "single-category" ? selectedCategoryDetails?.color : "#dc2626"
    });

    if (isMonthlyBudget || filterType === "all-incomes") {
      y = addTableRow(doc, [
        "Balance",
        formatCurrency(totalIncomes - totalExpenses),
        formatCurrency(totalIncurredIncomes - totalIncurredExpenses),
        formatCurrency(totalPendingIncomes - totalPendingExpenses)
      ], y, {
        isAlternate: true,
        color: "#2563eb"
      });
    }
    y += 15;

    // Current Transactions Section
    if ((isMonthlyBudget || filterType === "all-incomes") && processedIncomes.some(income => income.dates.some(date => !date.isPending))) {
      // Income Transactions
      doc.setFillColor(240, 253, 244);
      doc.rect(15, y - 5, 180, 10, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor("#047857");
      doc.text("Received Income", 15, y);
      y += 15;

      const incomeHeaders = ["#", "Name", "Amount", "Date"];
      y = addTableHeader(doc, incomeHeaders, y, {
        bgColor: '#f0fdf4',
        textColor: '#047857'
      });

      let alternate = true;
      processedIncomes.forEach((income, index) => {
        income.dates
          .filter(date => !date.isPending)
          .forEach((date, dateIndex) => {
            if (y > 270) {
              doc.addPage();
              y = 20;
              y = addTableHeader(doc, incomeHeaders, y, {
                bgColor: '#f0fdf4',
                textColor: '#047857'
              });
            }
            y = addTableRow(doc, [
              (dateIndex + 1).toString(),
              income.name,
              formatCurrency(date.amount),
              format(date.date, 'MMM dd')
            ], y, {
              isAlternate: alternate,
              color: "#047857"
            });
            alternate = !alternate;
          });
      });
      y += 15;
    }

    // Expense Transactions
    if (processedExpenses.some(expense => expense.dates.some(date => !date.isPending))) {
      doc.setFillColor(254, 242, 242);
      doc.rect(15, y - 5, 180, 10, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor("#dc2626");
      doc.text("Paid Expenses", 15, y);
      y += 15;

      const expenseHeaders = ["#", "Name", "Amount", "Date"];
      y = addTableHeader(doc, expenseHeaders, y, {
        bgColor: '#fef2f2',
        textColor: '#dc2626'
      });

      let alternate = true;
      processedExpenses.forEach((expense, index) => {
        expense.dates
          .filter(date => !date.isPending)
          .forEach((date, dateIndex) => {
            if (y > 270) {
              doc.addPage();
              y = 20;
              y = addTableHeader(doc, expenseHeaders, y, {
                bgColor: '#fef2f2',
                textColor: '#dc2626'
              });
            }
            y = addTableRow(doc, [
              (dateIndex + 1).toString(),
              expense.name,
              formatCurrency(date.amount),
              format(date.date, 'MMM dd')
            ], y, {
              isAlternate: alternate,
              color: filterType === "single-category" ? selectedCategoryDetails?.color : "#dc2626",
              isPending: date.isPending
            });
            alternate = !alternate;
          });
      });
      y += 15;
    }

    // Pending Transactions Section
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(241, 245, 249);
    doc.rect(15, y - 5, 180, 10, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor("#0f172a");
    doc.text("Pending Transactions", 15, y);
    y += 15;

    // Pending Income
    if ((isMonthlyBudget || filterType === "all-incomes") && processedIncomes.some(income => income.dates.some(date => date.isPending))) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor("#047857");
      doc.text("Upcoming Income", 15, y);
      y += 10;

      const pendingIncomeHeaders = ["#", "Name", "Amount", "Due Date"];
      y = addTableHeader(doc, pendingIncomeHeaders, y, {
        bgColor: '#f0fdf4',
        textColor: '#047857'
      });

      let alternate = true;
      processedIncomes.forEach((income, index) => {
        income.dates
          .filter(date => date.isPending)
          .forEach((date, dateIndex) => {
            if (y > 270) {
              doc.addPage();
              y = 20;
              y = addTableHeader(doc, pendingIncomeHeaders, y, {
                bgColor: '#f0fdf4',
                textColor: '#047857'
              });
            }
            y = addTableRow(doc, [
              (dateIndex + 1).toString(),
              income.name,
              formatCurrency(date.amount),
              format(date.date, 'MMM dd')
            ], y, {
              isAlternate: alternate,
              color: "#047857",
              isPending: true
            });
            alternate = !alternate;
          });
      });
      y += 15;
    }

    // Pending Expenses
    if (processedExpenses.some(expense => expense.dates.some(date => date.isPending))) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor("#dc2626");
      doc.text("Upcoming Expenses", 15, y);
      y += 10;

      const pendingExpenseHeaders = ["#", "Name", "Amount", "Due Date"];
      y = addTableHeader(doc, pendingExpenseHeaders, y, {
        bgColor: '#fef2f2',
        textColor: '#dc2626'
      });

      let alternate = true;
      processedExpenses.forEach((expense, index) => {
        expense.dates
          .filter(date => date.isPending)
          .forEach((date, dateIndex) => {
            if (y > 270) {
              doc.addPage();
              y = 20;
              y = addTableHeader(doc, pendingExpenseHeaders, y, {
                bgColor: '#fef2f2',
                textColor: '#dc2626'
              });
            }
            y = addTableRow(doc, [
              (dateIndex + 1).toString(),
              expense.name,
              formatCurrency(date.amount),
              format(date.date, 'MMM dd')
            ], y, {
              isAlternate: alternate,
              color: filterType === "single-category" ? selectedCategoryDetails?.color : "#dc2626",
              isPending: true
            });
            alternate = !alternate;
          });
      });
    }

    // Save the PDF
    const fileName = isMonthlyBudget ? 'monthly-budget' :
      filterType === "all-categories" ? 'category-report' :
        filterType === "single-category" ? `category-${selectedCategoryDetails?.name.toLowerCase()}-report` :
          filterType === "all-incomes" ? 'income-report' : 'expense-report';

    doc.save(`${fileName}-${format(startDate, 'yyyy-MM-dd')}.pdf`);
  };

  const handleExcelDownload = () => {
    const wsData = [
      [getReportTitle()],
      [isMonthlyBudget
        ? `${format(startOfMonth(startDate), 'MMMM dd, yyyy')} - ${format(endOfMonth(startDate), 'MMMM dd, yyyy')}`
        : `${format(startDate, 'MMMM dd, yyyy')} - ${format(endingDate, 'MMMM dd, yyyy')}`
      ],
      [`Generated on: ${format(new Date(), 'MMMM dd, yyyy')}`],
      [],
      ["Summary"],
      ["Category", "Total", "Occurred", "Pending"]
    ];

    if (isMonthlyBudget || filterType === "all-incomes") {
      wsData.push([
        "Income",
        formatCurrency(totalIncomes),
        formatCurrency(totalIncurredIncomes),
        formatCurrency(totalPendingIncomes)
      ]);
    }

    wsData.push([
      filterType === "single-category" ? selectedCategoryDetails?.name || "Expenses" : "Expenses",
      formatCurrency(totalExpenses),
      formatCurrency(totalIncurredExpenses),
      formatCurrency(totalPendingExpenses)
    ]);

    if (isMonthlyBudget || filterType === "all-incomes") {
      wsData.push([
        "Balance",
        formatCurrency(totalIncomes - totalExpenses),
        formatCurrency(totalIncurredIncomes - totalIncurredExpenses),
        formatCurrency(totalPendingIncomes - totalPendingExpenses)
      ]);
    }

    wsData.push([]);

    // Add Current Transactions section
    if ((isMonthlyBudget || filterType === "all-incomes") && processedIncomes.some(income => income.dates.some(date => !date.isPending))) {
      wsData.push(
        ["Current Transactions"],
        ["Received Income"],
        ["#", "Name", "Amount", "Date"]
      );

      processedIncomes.forEach((income, index) => {
        income.dates
          .filter(date => !date.isPending)
          .forEach((date, dateIndex) => {
            wsData.push([
              (dateIndex + 1).toString(),
              income.name,
              formatCurrency(date.amount),
              format(date.date, 'MMM dd')
            ]);
          });
      });
      wsData.push([]);
    }

    if (processedExpenses.some(expense => expense.dates.some(date => !date.isPending))) {
      wsData.push(
        ["Paid Expenses"],
        ["#", "Name", "Amount", "Date"]
      );

      processedExpenses.forEach((expense, index) => {
        expense.dates
          .filter(date => !date.isPending)
          .forEach((date, dateIndex) => {
            wsData.push([
              (dateIndex + 1).toString(),
              expense.name,
              formatCurrency(date.amount),
              format(date.date, 'MMM dd')
            ]);
          });
      });
      wsData.push([]);
    }

    // Add Pending Transactions section
    wsData.push(["Pending Transactions"]);

    if ((isMonthlyBudget || filterType === "all-incomes") && processedIncomes.some(income => income.dates.some(date => date.isPending))) {
      wsData.push(
        ["Upcoming Income"],
        ["#", "Name", "Amount", "Due Date"]
      );

      processedIncomes.forEach((income, index) => {
        income.dates
          .filter(date => date.isPending)
          .forEach((date, dateIndex) => {
            wsData.push([
              (dateIndex + 1).toString(),
              income.name,
              formatCurrency(date.amount),
              format(date.date, 'MMM dd')
            ]);
          });
      });
      wsData.push([]);
    }

    if (processedExpenses.some(expense => expense.dates.some(date => date.isPending))) {
      wsData.push(
        ["Upcoming Expenses"],
        ["#", "Name", "Amount", "Due Date"]
      );

      processedExpenses.forEach((expense, index) => {
        expense.dates
          .filter(date => date.isPending)
          .forEach((date, dateIndex) => {
            wsData.push([
              (dateIndex + 1).toString(),
              expense.name,
              formatCurrency(date.amount),
              format(date.date, 'MMM dd')
            ]);
          });
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 5 },  // #
      { wch: 30 }, // Name
      { wch: 15 }, // Amount
      { wch: 15 }  // Date
    ];

    const wb = XLSX.utils.book_new();
    const fileName = isMonthlyBudget ? 'Monthly Budget' :
      filterType === "all-categories" ? 'Category Report' :
        filterType === "single-category" ? `Category - ${selectedCategoryDetails?.name}` :
          filterType === "all-incomes" ? 'Income Report' : 'Expense Report';

    XLSX.utils.book_append_sheet(wb, ws, fileName);
    XLSX.writeFile(wb, `${fileName.toLowerCase().replace(/\s+/g, '-')}-${format(startDate, 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[75vh] flex flex-col">
        <DialogHeader className="flex-none bg-background px-4 py-2 border-b">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-lg font-semibold mb-1">
                {getReportTitle()}
              </DialogTitle>
              <div className="text-sm text-muted-foreground">
                <p>Period: {isMonthlyBudget
                  ? `${format(startOfMonth(startDate), 'MMMM dd, yyyy')} - ${format(endOfMonth(startDate), 'MMMM dd, yyyy')}`
                  : `${format(startDate, 'MMMM dd, yyyy')} - ${format(endingDate, 'MMMM dd, yyyy')}`
                }</p>
                <p>Generated on: {format(new Date(), 'MMMM dd, yyyy')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handlePDFDownload} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                PDF Report
              </Button>
              <Button onClick={handleExcelDownload} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Excel Report
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4 space-y-6">
            {/* Summary Section */}
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2 font-medium text-muted-foreground">Category</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Total</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Occurred</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(isMonthlyBudget || filterType === "all-incomes") && (
                      <tr>
                        <td className="p-2 font-medium text-green-600">Income</td>
                        <td className="p-2 text-right text-green-600">{formatCurrency(totalIncomes)}</td>
                        <td className="p-2 text-right text-green-600">{formatCurrency(totalIncurredIncomes)}</td>
                        <td className="p-2 text-right text-green-600/70">{formatCurrency(totalPendingIncomes)}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="p-2 font-medium text-left" style={{ color: filterType === "single-category" ? selectedCategoryDetails?.color : '#dc2626' }}>
                        {filterType === "single-category" ? selectedCategoryDetails?.name : "Expenses"}
                      </td>
                      <td className="p-2 text-right" style={{ color: filterType === "single-category" ? selectedCategoryDetails?.color : '#dc2626' }}>
                        {formatCurrency(totalExpenses)}
                      </td>
                      <td className="p-2 text-right" style={{ color: filterType === "single-category" ? selectedCategoryDetails?.color : '#dc2626' }}>
                        {formatCurrency(totalIncurredExpenses)}
                      </td>
                      <td className="p-2 text-right" style={{ color: filterType === "single-category" ? `${selectedCategoryDetails?.color}B3` : '#dc2626B3' }}>
                        {formatCurrency(totalPendingExpenses)}
                      </td>
                    </tr>
                    {(isMonthlyBudget || filterType === "all-incomes") && (
                      <tr className="bg-muted/50">
                        <td className="p-2 font-medium text-left text-blue-600">Balance</td>
                        <td className="p-2 text-right text-blue-600">{formatCurrency(totalIncomes - totalExpenses)}</td>
                        <td className="p-2 text-right text-blue-600">{formatCurrency(totalIncurredIncomes - totalIncurredExpenses)}</td>
                        <td className="p-2 text-right text-blue-600/70">{formatCurrency(totalPendingIncomes - totalPendingExpenses)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {filterType === "all-categories" && (
              <div className="space-y-6">
                {/* Category Summary Table */}
                <div className="rounded-lg border bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2 font-medium text-muted-foreground">Category</th>
                          <th className="text-right p-2 font-medium text-muted-foreground">Total</th>
                          <th className="text-right p-2 font-medium text-muted-foreground">Occurred</th>
                          <th className="text-right p-2 font-medium text-muted-foreground">Pending</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {groupedExpenses.map((group, index) => (
                          <tr key={group.category.id} className={index % 2 === 0 ? "bg-muted/50" : ""}>
                            <td className="p-2 font-medium text-left" style={{ color: group.category.color }}>{group.category.name}</td>
                            <td className="p-2 text-right" style={{ color: group.category.color }}>{formatCurrency(group.totalAmount)}</td>
                            <td className="p-2 text-right" style={{ color: group.category.color }}>{formatCurrency(group.incurredAmount)}</td>
                            <td className="p-2 text-right" style={{ color: `${group.category.color}B3` }}>{formatCurrency(group.pendingAmount)}</td>
                          </tr>
                        ))}
                        {groupedExpenses.length > 0 && (
                          <tr className="font-semibold bg-muted">
                            <td className="p-2 text-left">Total</td>
                            <td className="p-2 text-right">
                              {formatCurrency(groupedExpenses.reduce((sum, group) => sum + group.totalAmount, 0))}
                            </td>
                            <td className="p-2 text-right">
                              {formatCurrency(groupedExpenses.reduce((sum, group) => sum + group.incurredAmount, 0))}
                            </td>
                            <td className="p-2 text-right">
                              {formatCurrency(groupedExpenses.reduce((sum, group) => sum + group.pendingAmount, 0))}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Detailed Category Sections */}
                {groupedExpenses.map(group => (
                  <div key={group.category.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold" style={{ color: group.category.color }}>
                        {group.category.name}
                      </h3>
                      <div className="text-sm space-x-4">
                        <span>Total: <span style={{ color: group.category.color }}>{formatCurrency(group.totalAmount)}</span></span>
                        <span>Occurred: <span style={{ color: group.category.color }}>{formatCurrency(group.incurredAmount)}</span></span>
                        <span>Pending: <span style={{ color: `${group.category.color}B3` }}>{formatCurrency(group.pendingAmount)}</span></span>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-card">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-2 font-medium text-muted-foreground">Name</th>
                              <th className="text-right p-2 font-medium text-muted-foreground">Amount</th>
                              <th className="text-center p-2 font-medium text-muted-foreground">Date</th>
                              <th className="text-center p-2 font-medium text-muted-foreground">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {group.expenses.map(expense => (
                              expense.dates.map((date, dateIndex) => (
                                <tr key={`${expense.id}-${dateIndex}`} className="hover:bg-muted/50">
                                  <td className="p-2 font-medium text-left" style={{ color: group.category.color }}>{expense.name}</td>
                                  <td className="p-2 text-right" style={{ color: date.isPending ? `${group.category.color}B3` : group.category.color }}>
                                    {formatCurrency(date.amount)}
                                  </td>
                                  <td className="p-2 text-center">{format(date.date, 'MMM dd')}</td>
                                  <td className="p-2 text-center" style={{ color: date.isPending ? `${group.category.color}B3` : group.category.color }}>
                                    {date.isPending ? "Pending" : "Paid"}
                                  </td>
                                </tr>
                              ))
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Current Transactions */}
            {filterType !== "all-categories" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Current Transactions</h3>

                {/* Current Income Section - show for Monthly Budget or Income reports */}
                {(isMonthlyBudget || filterType === "all-incomes") && processedIncomes.some(income => income.dates.some(date => !date.isPending)) && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-green-600">Received Income</h4>
                    <div className="rounded-lg border bg-card">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-2 font-medium text-muted-foreground w-12">#</th>
                              <th className="text-left p-2 font-medium text-muted-foreground">Name</th>
                              <th className="text-right p-2 font-medium text-muted-foreground">Amount</th>
                              <th className="text-center p-2 font-medium text-muted-foreground">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {processedIncomes.map((income, index) => (
                              income.dates
                                .filter(date => !date.isPending)
                                .map((date, dateIndex) => (
                                  <tr key={`${income.id}-${dateIndex}`} className="hover:bg-muted/50">
                                    <td className="p-2 text-sm text-muted-foreground text-left">{dateIndex + 1}</td>
                                    <td className="p-2 text-left">
                                      <span className="font-medium text-green-600">{income.name}</span>
                                      <span className="text-sm text-muted-foreground ml-2">({income.frequency})</span>
                                    </td>
                                    <td className="p-2 text-right text-green-600">{formatCurrency(date.amount)}</td>
                                    <td className="p-2 text-center">{format(date.date, 'MMM dd')}</td>
                                  </tr>
                                ))
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Current Expenses Section */}
                {processedExpenses.some(expense => expense.dates.some(date => !date.isPending)) && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-600">Paid Expenses</h4>
                    <div className="rounded-lg border bg-card">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-2 font-medium text-muted-foreground w-12">#</th>
                              <th className="text-left p-2 font-medium text-muted-foreground">Name</th>
                              <th className="text-right p-2 font-medium text-muted-foreground">Amount</th>
                              <th className="text-center p-2 font-medium text-muted-foreground">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {processedExpenses.map((expense, index) => (
                              expense.dates
                                .filter(date => !date.isPending)
                                .map((date, dateIndex) => (
                                  <tr key={`${expense.id}-${dateIndex}`} className="hover:bg-muted/50">
                                    <td className="p-2 text-sm text-muted-foreground text-left">{dateIndex + 1}</td>
                                    <td className="p-2 text-left font-medium text-red-600">{expense.name}</td>
                                    <td className="p-2 text-right text-red-600">{formatCurrency(date.amount)}</td>
                                    <td className="p-2 text-center">{format(date.date, 'MMM dd')}</td>
                                  </tr>
                                ))
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {filterType !== "all-categories" && <Separator />}

            {/* Pending Transactions */}
            {filterType !== "all-categories" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pending Transactions</h3>

                {/* Pending Income Section - show for Monthly Budget or Income reports */}
                {(isMonthlyBudget || filterType === "all-incomes") && processedIncomes.some(income => income.dates.some(date => date.isPending)) && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-green-600/70">Upcoming Income</h4>
                    <div className="rounded-lg border bg-card/50">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-2 font-medium text-muted-foreground w-12">#</th>
                              <th className="text-left p-2 font-medium text-muted-foreground">Name</th>
                              <th className="text-right p-2 font-medium text-muted-foreground">Amount</th>
                              <th className="text-center p-2 font-medium text-muted-foreground">Due Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {processedIncomes.map((income, index) => (
                              income.dates
                                .filter(date => date.isPending)
                                .map((date, dateIndex) => (
                                  <tr key={`${income.id}-${dateIndex}`} className="hover:bg-muted/50">
                                    <td className="p-2 text-sm text-muted-foreground text-left">{dateIndex + 1}</td>
                                    <td className="p-2 text-left">
                                      <span className="font-medium text-green-600/70">{income.name}</span>
                                      <span className="text-sm text-muted-foreground ml-2">({income.frequency})</span>
                                    </td>
                                    <td className="p-2 text-right text-green-600/70">{formatCurrency(date.amount)}</td>
                                    <td className="p-2 text-center">{format(date.date, 'MMM dd')}</td>
                                  </tr>
                                ))
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pending Expenses Section */}
                {processedExpenses.some(expense => expense.dates.some(date => date.isPending)) && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-600/70">Upcoming Expenses</h4>
                    <div className="rounded-lg border bg-card/50">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-2 font-medium text-muted-foreground w-12">#</th>
                              <th className="text-left p-2 font-medium text-muted-foreground">Name</th>
                              <th className="text-right p-2 font-medium text-muted-foreground">Amount</th>
                              <th className="text-center p-2 font-medium text-muted-foreground">Due Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {processedExpenses.map((expense, index) => (
                              expense.dates
                                .filter(date => date.isPending)
                                .map((date, dateIndex) => (
                                  <tr key={`${expense.id}-${dateIndex}`} className="hover:bg-muted/50">
                                    <td className="p-2 text-sm text-muted-foreground text-left">{dateIndex + 1}</td>
                                    <td className="p-2 text-left font-medium text-red-600/70">{expense.name}</td>
                                    <td className="p-2 text-right text-red-600/70">{formatCurrency(date.amount)}</td>
                                    <td className="p-2 text-center">{format(date.date, 'MMM dd')}</td>
                                  </tr>
                                ))
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}