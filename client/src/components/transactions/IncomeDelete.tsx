import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Income } from "@shared/schema";
import { useToast } from "../../hooks/use-toast";

interface IncomeDeleteProps {
  open: boolean;
  onClose: () => void;
  income: Income;
}

export default function IncomeDelete({ open, onClose, income }: IncomeDeleteProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const isPartOfTwiceMonthly = income.name.includes("1st Payment") || income.name.includes("2nd Payment");
      const baseName = income.name.replace(" - 1st Payment", "").replace(" - 2nd Payment", "");

      if (isPartOfTwiceMonthly) {
        // Get all incomes to find the related entry
        const response = await fetch('/api/incomes');
        if (!response.ok) {
          throw new Error('Failed to fetch incomes');
        }
        const allIncomes = await response.json();

        // Find the related income entry
        const relatedIncome = allIncomes.find((inc: Income) => 
          inc.id !== income.id && 
          inc.name.startsWith(baseName) && 
          (inc.name.includes("1st Payment") || inc.name.includes("2nd Payment"))
        );

        // Delete both entries
        const deletePromises = [
          fetch(`/api/incomes/${income.id}`, { method: "DELETE" }),
          relatedIncome && fetch(`/api/incomes/${relatedIncome.id}`, { method: "DELETE" })
        ].filter(Boolean);

        const results = await Promise.all(deletePromises);

        if (!results.every(res => res.ok)) {
          throw new Error('Failed to delete one or more income entries');
        }

        return null;
      } else {
        // Regular single income deletion
        const response = await fetch(`/api/incomes/${income.id}`, {
          method: "DELETE"
        });
        if (!response.ok) {
          throw new Error('Failed to delete income');
        }
        // For 204 No Content responses, we don't try to parse JSON
        if (response.status === 204) {
          return null;
        }
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/incomes'] });
      toast({
        title: "Income Deleted",
        description: `Successfully deleted income: ${income.name}`
      });
      onClose();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete income'
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Income</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the income "{income.name}"? This action cannot be undone.
            {(income.name.includes("1st Payment") || income.name.includes("2nd Payment")) && 
              " Both entries of this twice-monthly income will be deleted."}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}