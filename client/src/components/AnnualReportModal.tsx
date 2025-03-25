import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { formatCurrency, getRecurringDates } from "../lib/utils";
import { isWithinInterval, startOfYear, endOfYear, format, isBefore, parseISO, isValid } from "date-fns";
import { Button } from "./ui/button";
import { Download } from "lucide-react";
import type { Expense, Income } from "@shared/schema";
import { Separator } from "./ui/separator";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

interface AnnualReportModalProps {
  open: boolean;
  onClose: () => void;
  date: Date;
  expenses: Expense[];
  incomes: Income[];
  title: string;
}

// Helper function to add table header in PDF
const addTableHeader = (doc: jsPDF, headers: string[], y: number, options: {
  bgColor?: string;
  textColor?: string;
} = {}): number => {
  const { bgColor = '#f8fafc', textColor = '#0f172a' } = options;

  // Convert hex to RGB for PDF
  const rgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const color = rgb(bgColor);
  doc.setFillColor(color.r, color.g, color.b);
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

// Helper function to add table row in PDF
const addTableRow = (doc: jsPDF, data: string[], y: number, options: {
  isAlternate?: boolean;
  color?: string;
} = {}): number => {
  const { isAlternate = false, color = "#334155" } = options;

  if (isAlternate) {
    doc.setFillColor(250, 250, 250);
    doc.rect(15, y - 5, 180, 8, 'F');
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const rgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const textColor = rgb(color);
  doc.setTextColor(textColor.r, textColor.g, textColor.b);

  const colWidth = 180 / data.length;
  data.forEach((cell, index) => {
    const x = 15 + (index * colWidth);
    const align = index <= 1 ? "left" : "right";
    doc.text(cell, align === "left" ? x + 2 : x + colWidth - 2, y, { align });
  });

  return y + 8;
};

export default function AnnualReportModal({
  open,
  onClose,
  date,
  expenses,
  incomes,
  title,
}: AnnualReportModalProps) {
  const yearStart = startOfYear(date);
  const yearEnd = endOfYear(date);
  const interval = { start: yearStart, end: yearEnd };
  const generationDate = new Date();

  // Process incomes annually
  const processedIncomes = incomes.map(income => {
    const incomeDate = typeof income.date === 'string' ? parseISO(income.date) : income.date;
    if (!isValid(incomeDate)) {
      console.error("Invalid income date:", income.date);
      return null;
    }

    let incurredAmount = 0;
    let pendingAmount = 0;
    const dates = getRecurringDates(incomeDate, income.frequency, yearEnd)
      .filter(d => isWithinInterval(d, interval))
      .map(d => ({
        isPending: !isBefore(d, generationDate),
        amount: Number(income.amount)
      }));

    dates.forEach(d => {
      if (d.isPending) {
        pendingAmount += d.amount;
      } else {
        incurredAmount += d.amount;
      }
    });

    return {
      ...income,
      incurredAmount,
      pendingAmount,
      totalAmount: incurredAmount + pendingAmount
    };
  }).filter(income => income !== null && (income.incurredAmount > 0 || income.pendingAmount > 0)) as (Income & {
    incurredAmount: number;
    pendingAmount: number;
    totalAmount: number;
  })[];

  // Process expenses annually
  const groupedExpenses = expenses.reduce((acc, expense) => {
    const expenseDate = typeof expense.date === 'string' ? parseISO(expense.date) : expense.date;
    if (!isValid(expenseDate)) {
      console.error("Invalid expense date:", expense.date);
      return acc;
    }

    const freq = expense.frequency.toUpperCase();
    if (!acc[freq]) {
      acc[freq] = {
        expenses: [],
        incurredTotal: 0,
        pendingTotal: 0
      };
    }

    const dates = getRecurringDates(expenseDate, expense.frequency, yearEnd)
      .filter(d => isWithinInterval(d, interval))
      .map(d => ({
        isPending: !isBefore(d, generationDate),
        amount: Number(expense.amount)
      }));

    let incurredAmount = 0;
    let pendingAmount = 0;

    dates.forEach(d => {
      if (d.isPending) {
        pendingAmount += d.amount;
      } else {
        incurredAmount += d.amount;
      }
    });

    if (incurredAmount > 0 || pendingAmount > 0) {
      acc[freq].expenses.push({
        ...expense,
        incurredAmount,
        pendingAmount,
        totalAmount: incurredAmount + pendingAmount
      });
      acc[freq].incurredTotal += incurredAmount;
      acc[freq].pendingTotal += pendingAmount;
    }

    return acc;
  }, {} as Record<string, {
    expenses: (Expense & {
      incurredAmount: number;
      pendingAmount: number;
      totalAmount: number;
    })[];
    incurredTotal: number;
    pendingTotal: number;
  }>);

  // Calculate totals
  const totalIncurredIncomes = processedIncomes.reduce((sum, inc) => sum + inc.incurredAmount, 0);
  const totalPendingIncomes = processedIncomes.reduce((sum, inc) => sum + inc.pendingAmount, 0);
  const totalIncomes = totalIncurredIncomes + totalPendingIncomes;

  const totalIncurredExpenses = Object.values(groupedExpenses).reduce((sum, group) => sum + group.incurredTotal, 0);
  const totalPendingExpenses = Object.values(groupedExpenses).reduce((sum, group) => sum + group.pendingTotal, 0);
  const totalExpenses = totalIncurredExpenses + totalPendingExpenses;

  const handlePDFDownload = () => {
    const doc = new jsPDF();
    let y = 25;

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor("#0f172a");
    doc.text(title, 15, y);
    y += 10;

    // Subtitle with date range
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor("#475569");
    doc.text(`Year ${format(date, 'yyyy')}`, 15, y);
    y += 8;

    // Generation date
    doc.setFontSize(10);
    doc.text(`Generated on ${format(generationDate, 'MMMM dd, yyyy')}`, 15, y);
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

    // Add summary rows
    y = addTableRow(doc, [
      "Income",
      formatCurrency(totalIncomes),
      formatCurrency(totalIncurredIncomes),
      formatCurrency(totalPendingIncomes)
    ], y, { color: "#047857" });

    y = addTableRow(doc, [
      "Expenses",
      formatCurrency(totalExpenses),
      formatCurrency(totalIncurredExpenses),
      formatCurrency(totalPendingExpenses)
    ], y, { color: "#dc2626" });

    y = addTableRow(doc, [
      "Balance",
      formatCurrency(totalIncomes - totalExpenses),
      formatCurrency(totalIncurredIncomes - totalIncurredExpenses),
      formatCurrency(totalPendingIncomes - totalPendingExpenses)
    ], y, { color: "#2563eb" });
    y += 15;

    // Income Section
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(240, 253, 244);
    doc.rect(15, y - 5, 180, 10, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor("#047857");
    doc.text("Income Details", 15, y);
    y += 15;

    const incomeHeaders = ["#", "Name", "Frequency", "Total", "Occurred", "Pending"];
    y = addTableHeader(doc, incomeHeaders, y, {
      bgColor: '#f0fdf4',
      textColor: '#047857'
    });

    // Add income rows
    processedIncomes.forEach((income, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
        y = addTableHeader(doc, incomeHeaders, y, {
          bgColor: '#f0fdf4',
          textColor: '#047857'
        });
      }

      y = addTableRow(doc, [
        (index + 1).toString(),
        income.name,
        income.frequency,
        formatCurrency(income.totalAmount),
        formatCurrency(income.incurredAmount),
        formatCurrency(income.pendingAmount)
      ], y, {
        isAlternate: index % 2 === 0,
        color: "#047857"
      });
    });
    y += 15;

    // Expense Section by Frequency
    Object.entries(groupedExpenses).forEach(([frequency, group]) => {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }

      // Frequency header
      doc.setFillColor(254, 242, 242);
      doc.rect(15, y - 5, 180, 10, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor("#dc2626");
      doc.text(`${frequency.charAt(0) + frequency.slice(1).toLowerCase()} Expenses`, 15, y);
      y += 15;

      const expenseHeaders = ["#", "Name", "Total", "Occurred", "Pending"];
      y = addTableHeader(doc, expenseHeaders, y, {
        bgColor: '#fef2f2',
        textColor: '#dc2626'
      });

      // Add expense rows for this frequency
      group.expenses.forEach((expense, index) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
          y = addTableHeader(doc, expenseHeaders, y, {
            bgColor: '#fef2f2',
            textColor: '#dc2626'
          });
        }

        y = addTableRow(doc, [
          (index + 1).toString(),
          expense.name,
          formatCurrency(expense.totalAmount),
          formatCurrency(expense.incurredAmount),
          formatCurrency(expense.pendingAmount)
        ], y, {
          isAlternate: index % 2 === 0,
          color: "#dc2626"
        });
      });

      // Add subtotal for this frequency
      y = addTableRow(doc, [
        "",
        "Subtotal",
        formatCurrency(group.incurredTotal + group.pendingTotal),
        formatCurrency(group.incurredTotal),
        formatCurrency(group.pendingTotal)
      ], y, {
        color: "#dc2626"
      });
      y += 15;
    });

    doc.save(`annual-report-${format(date, 'yyyy')}.pdf`);
  };

  const handleExcelDownload = () => {
    const wb = XLSX.utils.book_new();

    // Create worksheet data
    const wsData = [
      [`${title} - Year ${format(date, 'yyyy')}`],
      [`Generated on: ${format(generationDate, 'MMMM dd, yyyy')}`],
      [],
      ["Summary"],
      ["Category", "Total", "Occurred", "Pending"],
      ["Income", formatCurrency(totalIncomes), formatCurrency(totalIncurredIncomes), formatCurrency(totalPendingIncomes)],
      ["Expenses", formatCurrency(totalExpenses), formatCurrency(totalIncurredExpenses), formatCurrency(totalPendingExpenses)],
      ["Balance", formatCurrency(totalIncomes - totalExpenses), formatCurrency(totalIncurredIncomes - totalIncurredExpenses), formatCurrency(totalPendingIncomes - totalPendingExpenses)],
      [],
      ["Income Details"],
      ["#", "Name", "Frequency", "Total", "Occurred", "Pending"],
      ...processedIncomes.map((income, index) => [
        index + 1,
        income.name,
        income.frequency,
        formatCurrency(income.totalAmount),
        formatCurrency(income.incurredAmount),
        formatCurrency(income.pendingAmount)
      ]),
      []
    ];

    // Add expense sections by frequency
    Object.entries(groupedExpenses).forEach(([frequency, group]) => {
      wsData.push(
        [`${frequency.charAt(0) + frequency.slice(1).toLowerCase()} Expenses`],
        ["#", "Name", "Total", "Occurred", "Pending"],
        ...group.expenses.map((expense, index) => [
          index + 1,
          expense.name,
          formatCurrency(expense.totalAmount),
          formatCurrency(expense.incurredAmount),
          formatCurrency(expense.pendingAmount)
        ]),
        ["", "Subtotal", formatCurrency(group.incurredTotal + group.pendingTotal), formatCurrency(group.incurredTotal), formatCurrency(group.pendingTotal)],
        []
      );
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },  // #
      { wch: 40 }, // Name
      { wch: 15 }, // Frequency/Total
      { wch: 15 }, // Total/Occurred
      { wch: 15 }, // Occurred/Pending
      { wch: 15 }  // Pending (for income table)
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Annual Report");

    // Save workbook
    XLSX.writeFile(wb, `annual-report-${format(date, 'yyyy')}.xlsx`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[75vh] flex flex-col">
        <DialogHeader className="flex-none bg-background px-4 py-2 border-b">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-lg font-semibold mb-1">{title}</DialogTitle>
              <div className="text-sm text-muted-foreground">
                <p>Year: {format(date, 'yyyy')}</p>
                <p>Generated on: {format(generationDate, 'MMMM dd, yyyy')}</p>
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
                    <tr>
                      <td className="p-2 font-medium text-green-600">Income</td>
                      <td className="p-2 text-right text-green-600">{formatCurrency(totalIncomes)}</td>
                      <td className="p-2 text-right text-green-600">{formatCurrency(totalIncurredIncomes)}</td>
                      <td className="p-2 text-right text-green-600/70">{formatCurrency(totalPendingIncomes)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium text-red-600">Expenses</td>
                      <td className="p-2 text-right text-red-600">{formatCurrency(totalExpenses)}</td>
                      <td className="p-2 text-right text-red-600">{formatCurrency(totalIncurredExpenses)}</td>
                      <td className="p-2 text-right text-red-600/70">{formatCurrency(totalPendingExpenses)}</td>
                    </tr>
                    <tr className="bg-muted/50">
                      <td className="p-2 font-medium text-blue-600">Balance</td>
                      <td className="p-2 text-right text-blue-600">{formatCurrency(totalIncomes - totalExpenses)}</td>
                      <td className="p-2 text-right text-blue-600">
                        {formatCurrency(totalIncurredIncomes - totalIncurredExpenses)}
                      </td>
                      <td className="p-2 text-right text-blue-600/70">
                        {formatCurrency(totalPendingIncomes - totalPendingExpenses)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Income Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Annual Income Summary</h3>
              <div className="rounded-lg border bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2 font-medium text-muted-foreground w-12">#</th>
                        <th className="text-left p-2 font-medium text-muted-foreground">Name</th>
                        <th className="text-left p-2 font-medium text-muted-foreground">Frequency</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Total</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Occurred</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Pending</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {processedIncomes.map((income, index) => (
                        <tr key={income.id} className="hover:bg-muted/50">
                          <td className="p-2 text-sm text-muted-foreground">{index + 1}</td>
                          <td className="p-2 font-medium text-green-600">{income.name}</td>
                          <td className="p-2">{income.frequency}</td>
                          <td className="p-2 text-right text-green-600">{formatCurrency(income.totalAmount)}</td>
                          <td className="p-2 text-right text-green-600">{formatCurrency(income.incurredAmount)}</td>
                          <td className="p-2 text-right text-green-600/70">{formatCurrency(income.pendingAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <Separator />

            {/* Expense Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Annual Expense Summary</h3>
              {Object.entries(groupedExpenses).map(([frequency, group]) => (
                <div key={frequency} className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">{frequency.charAt(0) + frequency.slice(1).toLowerCase()} Expenses</h4>
                    <div className="text-right">
                      <div className="font-medium text-red-600">
                        {formatCurrency(group.incurredTotal + group.pendingTotal)}
                      </div>
                      <div className="text-sm">
                        <div>Occurred: {formatCurrency(group.incurredTotal)}</div>
                        <div>Pending: {formatCurrency(group.pendingTotal)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-card">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-2 font-medium text-muted-foreground w-12">#</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Name</th>
                            <th className="text-right p-2 font-medium text-muted-foreground">Total</th>
                            <th className="text-right p-2 font-medium text-muted-foreground">Occurred</th>
                            <th className="text-right p-2 font-medium text-muted-foreground">Pending</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {group.expenses.map((expense, index) => (
                            <tr key={expense.id} className="hover:bg-muted/50">
                              <td className="p-2 text-sm text-muted-foreground">{index + 1}</td>
                              <td className="p-2 font-medium text-red-600">{expense.name}</td>
                              <td className="p-2 text-right text-red-600">{formatCurrency(expense.totalAmount)}</td>
                              <td className="p-2 text-right text-red-600">{formatCurrency(expense.incurredAmount)}</td>
                              <td className="p-2 text-right text-red-600/70">{formatCurrency(expense.pendingAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}