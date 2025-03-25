import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import type { Income } from "../../../../shared/schema";
import { format, parseISO } from "date-fns";
import { Button } from "../ui/button";
import { useState } from "react";
import IncomeDelete from "./IncomeDelete";
interface IncomeListProps {
  open: boolean;
  onClose: () => void;
  onEdit: (income: Income) => void;
}

export default function IncomeList({ open, onClose, onEdit }: IncomeListProps) {
  const { data: incomes } = useQuery<Income[]>({
    queryKey: ['/api/incomes']
  });

  const [deleteIncome, setDeleteIncome] = useState<Income | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Income</DialogTitle>
          </DialogHeader>

          <div className="relative overflow-x-auto max-h-[calc(80vh-8rem)]">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes?.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell>{income.name}</TableCell>
                    <TableCell>${income.amount}</TableCell>
                    <TableCell>{format(parseISO(income.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{income.source}</TableCell>
                    <TableCell>{income.frequency}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => onEdit(income)}
                          variant="ghost"
                          className="text-blue-500 hover:text-blue-700"
                        >
                          Edit
                        </Button>
                        <Button 
                          onClick={() => setDeleteIncome(income)}
                          variant="ghost"
                          className="text-red-500 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {deleteIncome && (
        <IncomeDelete
          open={true}
          onClose={() => setDeleteIncome(null)}
          income={deleteIncome}
        />
      )}
    </>
  );
}