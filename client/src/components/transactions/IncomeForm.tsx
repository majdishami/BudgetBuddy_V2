import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { CalendarIcon } from "lucide-react";
import { parseISO } from "date-fns";
import { insertIncomeSchema, type Income } from "../../../../shared/schema";
import { useToast } from "../../hooks/use-toast";
import { formatDateForServer, formatDateForDisplay } from "../../lib/utils";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const StyledSelectContent = React.forwardRef<
  React.ElementRef<typeof SelectContent>,
  React.ComponentPropsWithoutRef<typeof SelectContent>
>(({ className, children, ...props }, ref) => (
  <SelectContent
    ref={ref}
    className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-md ${className}`}
    {...props}
  >
    {children}
  </SelectContent>
));
StyledSelectContent.displayName = "StyledSelectContent";

interface IncomeFormProps {
  open: boolean;
  onClose: () => void;
  editIncome?: Income;
}

export default function IncomeForm({ open, onClose, editIncome }: IncomeFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const today = new Date(Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
    12, 0, 0
  ));

  const initialDate = editIncome
    ? (() => {
        const parsed = parseISO(editIncome.date);
        return new Date(Date.UTC(
          parsed.getUTCFullYear(),
          parsed.getUTCMonth(),
          parsed.getUTCDate(),
          12, 0, 0
        ));
      })()
    : today;

  const form = useForm({
    resolver: zodResolver(insertIncomeSchema),
    defaultValues: {
      name: editIncome?.name ?? "",
      amount: editIncome?.amount ?? "",
      date: initialDate,
      frequency: editIncome?.frequency ?? "",
      source: editIncome?.source ?? ""
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const formattedData = {
        ...values,
        date: formatDateForServer(values.date),
        amount: String(values.amount)
      };

      const response = await fetch(
        editIncome ? `/api/incomes/${editIncome.id}` : '/api/incomes',
        {
          method: editIncome ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formattedData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save income');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
      toast({
        title: `Income ${editIncome ? 'Updated' : 'Created'}`,
        description: `Income was successfully ${editIncome ? 'updated' : 'created'}.`
      });
      onClose();
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editIncome ? 'update' : 'create'} income`,
        variant: "destructive"
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editIncome ? 'Edit' : 'Add'} Income</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <DatePicker
                    selected={field.value}
                    onChange={(date: Date | null) => {
                      if (date) {
                        const utcDate = new Date(Date.UTC(
                          date.getUTCFullYear(),
                          date.getUTCMonth(),
                          date.getUTCDate(),
                          12, 0, 0
                        ));
                        field.onChange(utcDate);
                      }
                    }}
                    dateFormat="MMMM d, yyyy"
                    customInput={
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formatDateForDisplay(field.value)}
                      </Button>
                    }
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <StyledSelectContent>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                      <SelectItem value="YEARLY">Yearly</SelectItem>
                      <SelectItem value="ONCE">Once</SelectItem>
                    </StyledSelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : editIncome ? 'Update' : 'Add'} Income
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}