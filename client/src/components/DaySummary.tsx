import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { formatCurrency, getRecurringDates } from "../lib/utils";
import { startOfMonth, endOfMonth, isWithinInterval, isBefore, parseISO, format, isAfter, isSameDay, isValid } from "date-fns";
import type { Expense, Income } from "@shared/schema";

interface DaySummaryProps {
  open: boolean;
  onClose: () => void;
  date: Date;
  expenses: Expense[];
  incomes: Income[];
}

export default function DaySummary({
  open,
  onClose,
  date,
  expenses,
  incomes,
}: DaySummaryProps) {
  try {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const interval = { start: monthStart, end: monthEnd };
    const today = new Date();

    // Create a map of transactions by date
    const transactionsByDate = new Map<string, { incomes: Income[], expenses: Expense[] }>();

    // Process all incomes
    incomes.forEach(income => {
      const incomeDate = typeof income.date === 'string' ? parseISO(income.date) : income.date;
      if (!isValid(incomeDate)) {
        console.error("Invalid income date:", income.date);
        return;
      }

      // Get recurring dates for this income within the current month
      const recurringDates = getRecurringDates(incomeDate, income.frequency, monthEnd)
        .filter(d => isWithinInterval(d, interval));

      recurringDates.forEach(recDate => {
        const dateKey = format(recDate, 'yyyy-MM-dd');
        if (!transactionsByDate.has(dateKey)) {
          transactionsByDate.set(dateKey, { incomes: [], expenses: [] });
        }
        transactionsByDate.get(dateKey)!.incomes.push({...income, date: format(recDate, 'yyyy-MM-dd')});
      });
    });

    // Process all expenses
    expenses.forEach(expense => {
      const expenseDate = typeof expense.date === 'string' ? parseISO(expense.date) : expense.date;
      if (!isValid(expenseDate)) {
        console.error("Invalid expense date:", expense.date);
        return;
      }

      const recurringDates = getRecurringDates(expenseDate, expense.frequency, monthEnd)
        .filter(d => isWithinInterval(d, interval));

      recurringDates.forEach(recDate => {
        const dateKey = format(recDate, 'yyyy-MM-dd');
        if (!transactionsByDate.has(dateKey)) {
          transactionsByDate.set(dateKey, { incomes: [], expenses: [] });
        }
        transactionsByDate.get(dateKey)!.expenses.push({...expense, date: format(recDate, 'yyyy-MM-dd')});
      });
    });

    // Get pending transactions (after selected date)
    const pendingTransactions = Array.from(transactionsByDate.entries())
      .filter(([dateKey]) => isAfter(parseISO(dateKey), date))
      .sort(([dateA], [dateB]) => parseISO(dateA).getTime() - parseISO(dateB).getTime());

    // Get clicked day's transactions
    const clickedDateKey = format(date, 'yyyy-MM-dd');
    const clickedDayTransactions = transactionsByDate.get(clickedDateKey) || { incomes: [], expenses: [] };
    const clickedDayIncomeTotal = clickedDayTransactions.incomes.reduce((sum, income) => 
      sum + Number(income.amount), 0
    );
    const clickedDayExpenseTotal = clickedDayTransactions.expenses.reduce((sum, expense) => 
      sum + Number(expense.amount), 0
    );
    const clickedDayNetTotal = clickedDayIncomeTotal - clickedDayExpenseTotal;

    // Calculate all totals
    let totalIncurredIncomes = 0;
    let totalPendingIncomes = 0;
    let totalIncurredExpenses = 0;
    let totalPendingExpenses = 0;

    // Process each day's transactions
    Array.from(transactionsByDate.entries()).forEach(([dateKey, transactions]) => {
      const transactionDate = parseISO(dateKey);
      const isPending = !isBefore(transactionDate, today);

      // Sum incomes
      transactions.incomes.forEach(income => {
        const amount = Number(income.amount);
        if (isPending) {
          totalPendingIncomes += amount;
        } else {
          totalIncurredIncomes += amount;
        }
      });

      // Sum expenses
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

    // Keep track of sequence numbers
    let sequenceNumber = 1;

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4 border-b">
            <DialogTitle className="space-y-1">
              <div>{format(date, 'MMMM d, yyyy')}</div>
              <div className="text-sm text-muted-foreground">Monthly Summary & Pending Transactions</div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Monthly Summary Section */}
            <div className="space-y-6">
              {/* Income Section */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Monthly Income</h3>
                <div className="flex justify-between font-medium text-green-500">
                  <span>Incurred Income</span>
                  <span>{formatCurrency(totalIncurredIncomes)}</span>
                </div>
                <div className="flex justify-between font-medium text-green-500/70">
                  <span>Pending Income</span>
                  <span>{formatCurrency(totalPendingIncomes)}</span>
                </div>
                <div className="flex justify-between font-medium text-green-500 pt-2 border-t">
                  <span>Total Month Income</span>
                  <span>{formatCurrency(totalIncomes)}</span>
                </div>
              </div>

              {/* Expense Section */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Monthly Expenses</h3>
                <div className="flex justify-between font-medium text-red-500">
                  <span>Incurred Expenses</span>
                  <span>{formatCurrency(totalIncurredExpenses)}</span>
                </div>
                <div className="flex justify-between font-medium text-red-500/70">
                  <span>Pending Expenses</span>
                  <span>{formatCurrency(totalPendingExpenses)}</span>
                </div>
                <div className="flex justify-between font-medium text-red-500 pt-2 border-t">
                  <span>Total Month Expenses</span>
                  <span>{formatCurrency(totalExpenses)}</span>
                </div>
              </div>

              {/* Balance Section */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Monthly Balance</h3>
                <div className="flex justify-between font-medium text-blue-500">
                  <span>Incurred Balance</span>
                  <span>{formatCurrency(totalIncurredIncomes - totalIncurredExpenses)}</span>
                </div>
                <div className="flex justify-between font-medium text-blue-500/70">
                  <span>Pending Month-End Balance</span>
                  <span>{formatCurrency(totalPendingIncomes - totalPendingExpenses)}</span>
                </div>
                <div className="flex justify-between font-medium text-blue-500 pt-2 border-t">
                  <span>Total Month-End Balance</span>
                  <span>{formatCurrency(totalIncomes - totalExpenses)}</span>
                </div>
              </div>
            </div>

            {/* Clicked Day's Transactions Section */}
            {(clickedDayTransactions.incomes.length > 0 || clickedDayTransactions.expenses.length > 0) && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-lg">Today's Transactions</h3>
                <div className="space-y-2">
                  {/* Incomes for clicked day */}
                  {clickedDayTransactions.incomes.length > 0 && (
                    <div className="space-y-1">
                      {clickedDayTransactions.incomes.map((income, idx) => (
                        <div key={`${income.id}-${idx}`} className="flex justify-between items-center text-sm">
                          <span className="text-green-500 flex gap-2">
                            <span className="text-muted-foreground font-mono w-6">{sequenceNumber++}.</span>
                            {income.name}
                          </span>
                          <span className="font-medium text-green-500">{formatCurrency(Number(income.amount))}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expenses for clicked day */}
                  {clickedDayTransactions.expenses.length > 0 && (
                    <div className="space-y-1">
                      {clickedDayTransactions.expenses.map((expense, idx) => (
                        <div key={`${expense.id}-${idx}`} className="flex justify-between items-center text-sm">
                          <span className="text-red-500 flex gap-2">
                            <span className="text-muted-foreground font-mono w-6">{sequenceNumber++}.</span>
                            {expense.name}
                          </span>
                          <span className="font-medium text-red-500">{formatCurrency(Number(expense.amount))}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Daily Totals */}
                  <div className="pt-2 mt-2 border-t space-y-1 text-sm">
                    {clickedDayIncomeTotal > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-green-500">Total Income</span>
                        <span className="font-medium text-green-500">{formatCurrency(clickedDayIncomeTotal)}</span>
                      </div>
                    )}
                    {clickedDayExpenseTotal > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-red-500">Total Expenses</span>
                        <span className="font-medium text-red-500">{formatCurrency(clickedDayExpenseTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center font-medium">
                      <span className="text-blue-500">Net Total</span>
                      <span className={`${clickedDayNetTotal >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(clickedDayNetTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Transactions Section */}
            {pendingTransactions.length > 0 && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-lg">Upcoming Transactions</h3>
                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                  {pendingTransactions.map(([dateKey, transactions]) => {
                    // Calculate daily totals
                    const dailyIncomeTotal = transactions.incomes.reduce((sum, income) => 
                      sum + Number(income.amount), 0
                    );
                    const dailyExpenseTotal = transactions.expenses.reduce((sum, expense) => 
                      sum + Number(expense.amount), 0
                    );
                    const dailyNetTotal = dailyIncomeTotal - dailyExpenseTotal;

                    return (
                      <div key={dateKey} className="space-y-2">
                        <h4 className="font-medium">{format(parseISO(dateKey), 'MMMM d, yyyy')}</h4>

                        {/* Incomes for this date */}
                        {transactions.incomes.length > 0 && (
                          <div className="space-y-1">
                            {transactions.incomes.map((income, idx) => (
                              <div key={`${income.id}-${idx}`} className="flex justify-between items-center text-sm">
                                <span className="text-green-500 flex gap-2">
                                  <span className="text-muted-foreground font-mono w-6">{sequenceNumber++}.</span>
                                  {income.name}
                                </span>
                                <span className="font-medium text-green-500">{formatCurrency(Number(income.amount))}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Expenses for this date */}
                        {transactions.expenses.length > 0 && (
                          <div className="space-y-1">
                            {transactions.expenses.map((expense, idx) => (
                              <div key={`${expense.id}-${idx}`} className="flex justify-between items-center text-sm">
                                <span className="text-red-500 flex gap-2">
                                  <span className="text-muted-foreground font-mono w-6">{sequenceNumber++}.</span>
                                  {expense.name}
                                </span>
                                <span className="font-medium text-red-500">{formatCurrency(Number(expense.amount))}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Daily Subtotals */}
                        <div className="pt-2 mt-2 border-t space-y-1 text-sm">
                          {dailyIncomeTotal > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-green-500">Total Income</span>
                              <span className="font-medium text-green-500">{formatCurrency(dailyIncomeTotal)}</span>
                            </div>
                          )}
                          {dailyExpenseTotal > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-red-500">Total Expenses</span>
                              <span className="font-medium text-red-500">{formatCurrency(dailyExpenseTotal)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center font-medium">
                            <span className="text-blue-500">Net Total</span>
                            <span className={`${dailyNetTotal >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {formatCurrency(dailyNetTotal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  } catch (error) {
    console.error('Error in DaySummary:', error);
    return null;
  }
}