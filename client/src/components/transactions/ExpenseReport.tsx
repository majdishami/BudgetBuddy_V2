import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import DateRangePicker from '../ui/DateRangePicker';
import { formatCurrency } from '../../lib/utils';
import { Separator } from '../ui/separator';
import type { Expense, Income } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '../ui/badge';

interface ExpenseReportProps {
  open: boolean;
  onClose: () => void;
  onReport: (expense: Expense) => void;
}

export default function ExpenseReport({ open, onClose, onReport }: ExpenseReportProps) {
  const currentYear = new Date().getFullYear();
  const currentDate = new Date();
  
  const { data: expenses, refetch: refetchExpenses } = useQuery<Expense[]>({
    queryKey: ['/api/expenses', { year: currentYear }],
    staleTime: 0,
  });

  const { data: incomes, refetch: refetchIncomes } = useQuery<Income[]>({
    queryKey: ['/api/incomes', { year: currentYear }],
    staleTime: 0,
  });

  useEffect(() => {
    if (open) {
      refetchExpenses();
      refetchIncomes();
    }
  }, [open]);

  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>(undefined);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(undefined);

  const handleRangeSelect = (range: { from: Date | undefined; to: Date | undefined }) => {
    setSelectedStartDate(range.from);
    setSelectedEndDate(range.to);
  };

  const categorizeItems = (items: (Expense | Income)[], referenceDate: Date = currentDate) => {
    if (!items) return { occurred: [], pending: [] };
    
    const utcReference = new Date(referenceDate.toISOString());
    
    return {
      occurred: items.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate <= utcReference;
      }),
      pending: items.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate > utcReference;
      })
    };
  };

  const categorizedExpenses = categorizeItems(expenses || []);
  const categorizedIncomes = categorizeItems(incomes || []);

  const getTotalAmount = (items: (Expense | Income)[]) => {
    return items.reduce((total, item) => total + Number(item.amount), 0);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Financial Reports</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="annual" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="annual">Annual Report</TabsTrigger>
            <TabsTrigger value="expenses">Expenses Report</TabsTrigger>
            <TabsTrigger value="income">Income Report</TabsTrigger>
            <TabsTrigger value="date-range">Date Range Report</TabsTrigger>
          </TabsList>

          {/* Annual Report Tab */}
          <TabsContent value="annual">
            <div className="rounded-md border p-4 space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold">Annual Financial Report</h3>
                <p className="text-sm text-muted-foreground">
                  {currentYear} - Generated on {currentDate.toLocaleDateString()}
                </p>
              </div>

              {/* Expenses Section */}
              <div className="space-y-4">
                <h3 className="font-bold text-lg border-b pb-2">Expenses Summary</h3>
                
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Badge variant="destructive" className="px-2 py-0.5">Occurred</Badge>
                    <span>Completed Expenses</span>
                  </h4>
                  {categorizedExpenses.occurred.length > 0 ? (
                    <>
                      {categorizedExpenses.occurred.map((expense) => (
                        <div key={expense.id} className="border rounded-lg p-3 hover:bg-muted/50">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">{expense.name}</span>
                              <p className="text-xs text-muted-foreground">
                                {new Date(expense.date).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="text-red-500 font-medium">
                              {formatCurrency(Number(expense.amount))}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between items-center font-bold border-t pt-2">
                        <span>Total Occurred Expenses</span>
                        <span className="text-red-500">
                          {formatCurrency(getTotalAmount(categorizedExpenses.occurred))}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No expenses occurred yet</p>
                  )}
                </div>

                {/* Pending Expenses Section */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Badge variant="outline" className="px-2 py-0.5">Pending</Badge>
                    <span>Upcoming Expenses</span>
                  </h4>
                  {categorizedExpenses.pending.length > 0 ? (
                    <>
                      {categorizedExpenses.pending.map((expense) => (
                        <div key={expense.id} className="border rounded-lg p-3 hover:bg-muted/50">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">{expense.name}</span>
                              <p className="text-xs text-muted-foreground">
                                {new Date(expense.date).toLocaleDateString()} (Upcoming)
                              </p>
                            </div>
                            <span className="text-orange-500 font-medium">
                              {formatCurrency(Number(expense.amount))}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between items-center font-bold border-t pt-2">
                        <span>Total Pending Expenses</span>
                        <span className="text-orange-500">
                          {formatCurrency(getTotalAmount(categorizedExpenses.pending))}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No pending expenses</p>
                  )}
                </div>
              </div>

              <Separator className="my-4" />

              {/* Income Section */}
              <div className="space-y-4">
                <h3 className="font-bold text-lg border-b pb-2">Income Summary</h3>
                
                {/* Occurred Income Section */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Badge className="px-2 py-0.5 bg-green-500">Received</Badge>
                    <span>Completed Income</span>
                  </h4>
                  {categorizedIncomes.occurred.length > 0 ? (
                    <>
                      {categorizedIncomes.occurred.map((income) => (
                        <div key={income.id} className="border rounded-lg p-3 hover:bg-muted/50">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">{income.name}</span>
                              <p className="text-xs text-muted-foreground">
                                {new Date(income.date).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="text-green-500 font-medium">
                              {formatCurrency(Number(income.amount))}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between items-center font-bold border-t pt-2">
                        <span>Total Received Income</span>
                        <span className="text-green-500">
                          {formatCurrency(getTotalAmount(categorizedIncomes.occurred))}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No income received yet</p>
                  )}
                </div>

                {/* Pending Income Section */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Badge variant="outline" className="px-2 py-0.5">Pending</Badge>
                    <span>Expected Income</span>
                  </h4>
                  {categorizedIncomes.pending.length > 0 ? (
                    <>
                      {categorizedIncomes.pending.map((income) => (
                        <div key={income.id} className="border rounded-lg p-3 hover:bg-muted/50">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">{income.name}</span>
                              <p className="text-xs text-muted-foreground">
                                {new Date(income.date).toLocaleDateString()} (Expected)
                              </p>
                            </div>
                            <span className="text-blue-500 font-medium">
                              {formatCurrency(Number(income.amount))}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between items-center font-bold border-t pt-2">
                        <span>Total Expected Income</span>
                        <span className="text-blue-500">
                          {formatCurrency(getTotalAmount(categorizedIncomes.pending))}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No expected income</p>
                  )}
                </div>
              </div>

              {/* Summary Section */}
              <Separator className="my-4" />
              <div className="space-y-2">
                <h3 className="font-bold text-lg">Annual Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-sm text-muted-foreground">Total Expenses</h4>
                    <p className="text-red-500 font-bold text-xl">
                      {formatCurrency(getTotalAmount(expenses || []))}
                    </p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-sm text-muted-foreground">Total Income</h4>
                    <p className="text-green-500 font-bold text-xl">
                      {formatCurrency(getTotalAmount(incomes || []))}
                    </p>
                  </div>
                </div>
                <div className="border rounded-lg p-4 mt-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Net Balance</h4>
                  <p className={`font-bold text-xl ${
                    getTotalAmount(incomes || []) >= getTotalAmount(expenses || []) 
                      ? 'text-green-500' 
                      : 'text-red-500'
                  }`}>
                    {formatCurrency(getTotalAmount(incomes || []) - getTotalAmount(expenses || []))}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Other tabs remain unchanged */}
          {/* ... */}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}