import React from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import type { Expense } from "@shared/schema";
import { parseISO } from "date-fns";
import { Button } from "../ui/button";
import { formatDateForDisplay } from "../../lib/utils";
import { useToast } from "../../hooks/use-toast";

interface ExpenseListProps {
  open: boolean;
  onClose: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export default function ExpenseList({ open, onClose, onEdit, onDelete }: ExpenseListProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: expenses } = useQuery<Expense[]>({
    queryKey: ['/api/expenses']
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        const response = await fetch(`/api/expenses/${id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const responseData = await response.json();
          console.error('Error response:', responseData);
          throw new Error(responseData.message || 'Failed to delete expense');
        }

        return id;
      } catch (error) {
        console.error('Network or server error:', error);
        throw error;
      }
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      toast({
        title: 'Expense Deleted',
        description: `Expense with ID ${id} was successfully deleted.`,
        variant: 'default' // Change 'success' to 'default'
      });
      console.log('Expense successfully deleted:', id);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || 'Failed to delete expense',
        variant: "destructive"
      });
      console.error('Failed to delete expense:', error);
    }
  });

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log('ExpenseList Component:', {
    environment: typeof window !== 'undefined' ? 'browser' : 'server',
    userTimeZone
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Expenses</DialogTitle>
        </DialogHeader>

        <div className="relative overflow-x-auto max-h-[calc(80vh-8rem)]">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses?.map((expense) => {
                // Parse the date and ensure it's UTC noon
                const expenseDate = parseISO(expense.date);
                const utcDate = new Date(Date.UTC(
                  expenseDate.getUTCFullYear(),
                  expenseDate.getUTCMonth(),
                  expenseDate.getUTCDate(),
                  12, 0, 0
                ));

                console.log('Expense date processing:', {
                  id: expense.id,
                  originalDate: expense.date,
                  parsedDate: expenseDate.toISOString(),
                  utcDate: utcDate.toISOString(),
                  displayDate: formatDateForDisplay(utcDate)
                });

                return (
                  <TableRow key={expense.id}>
                    <TableCell>{expense.name}</TableCell>
                    <TableCell>${expense.amount}</TableCell>
                    <TableCell>{formatDateForDisplay(utcDate)}</TableCell>
                    <TableCell>{expense.frequency}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => onEdit(expense)}
                          variant="ghost"
                          className="text-blue-500 hover:text-blue-700"
                        >
                          Edit
                        </Button>
                        <Button 
                          onClick={() => deleteMutation.mutate(expense.id)}
                          variant="ghost"
                          className="text-red-500 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}