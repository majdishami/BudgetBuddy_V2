import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { CalendarIcon } from "lucide-react";
import { parseISO } from "date-fns";
import { insertExpenseSchema, type Category, type Expense } from "../../../../shared/schema";
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

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
  editExpense?: Expense;
}

export default function ExpenseForm({ open, onClose, editExpense }: ExpenseFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Robust deduplication of categories by both ID and lowercase name
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    select: (data) => {
      const uniqueCategories = new Map<number, Category>();
      const seenNames = new Set<string>();
      
      return data.filter(category => {
        const nameLower = category.name.toLowerCase();
        const isDuplicate = uniqueCategories.has(category.id) || seenNames.has(nameLower);
        if (!isDuplicate) {
          uniqueCategories.set(category.id, category);
          seenNames.add(nameLower);
        }
        return !isDuplicate;
      });
    }
  });

  const form = useForm({
    resolver: zodResolver(insertExpenseSchema),
    defaultValues: {
      name: '',
      amount: '',
      date: new Date(),
      frequency: '',
      categoryId: ''
    }
  });

  useEffect(() => {
    if (open) {
      if (editExpense) {
        form.reset({
          name: editExpense.name,
          amount: editExpense.amount,
          date: parseISO(editExpense.date),
          frequency: editExpense.frequency,
          categoryId: editExpense.categoryId?.toString() || ''
        });
      } else {
        form.reset({
          name: '',
          amount: '',
          date: new Date(),
          frequency: '',
          categoryId: ''
        });
      }
    }
  }, [open, editExpense, form]);

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        name: values.name,
        amount: values.amount,
        date: formatDateForServer(values.date),
        frequency: values.frequency,
        category_id: Number(values.categoryId)
      };

      const url = editExpense ? `/api/expenses/${editExpense.id}` : '/api/expenses';
      const method = editExpense ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save expense');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      toast({
        title: `Expense ${editExpense ? 'Updated' : 'Created'}`,
        description: `Expense was successfully ${editExpense ? 'updated' : 'created'}.`
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editExpense ? 'update' : 'create'} expense`,
        variant: "destructive"
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>{editExpense ? 'Edit' : 'Add'} Expense</DialogTitle>
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
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => {
                const value = field.value as Date;
                return (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <DatePicker
                      selected={value}
                      onChange={(date: Date | null) => {
                        if (date) {
                          field.onChange(date);
                        }
                      }}
                      dateFormat="MMMM d, yyyy"
                      customInput={
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formatDateForDisplay(value)}
                        </Button>
                      }
                    />
                    <FormMessage />
                  </FormItem>
                );
              }}
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
              name="categoryId"
              render={({ field }) => {
                const currentCategory = categories.find(c => c.id.toString() === field.value);
                return (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={currentCategory?.name || "Select category"} />
                        </SelectTrigger>
                      </FormControl>
                      <StyledSelectContent>
                        {categories.map((category) => (
                          <SelectItem 
                            key={`${category.id}-${category.name}`}
                            value={category.id.toString()}
                          >
                            {category.name}
                          </SelectItem>
                        ))}
                      </StyledSelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : editExpense ? 'Update' : 'Add'} Expense
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}