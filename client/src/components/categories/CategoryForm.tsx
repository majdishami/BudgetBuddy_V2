import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { apiRequest } from "@/lib/queryClient";
import { insertCategorySchema } from "../../../../shared/schema";
import type { Category } from "@shared/schema";
import { useToast } from "../../hooks/use-toast";

interface CategoryFormProps {
  open: boolean;
  onClose: () => void;
  editCategory?: Category;
}

export default function CategoryForm({ open, onClose, editCategory }: CategoryFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: editCategory?.name ?? "",
      color: editCategory?.color ?? "#000000",
      icon: editCategory?.icon ?? ""
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: unknown) => {
      const endpoint = editCategory 
        ? `/api/categories/${editCategory.id}` 
        : '/api/categories';
      const method = editCategory ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save category');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: `Category ${editCategory ? 'Updated' : 'Created'}`,
        description: `Category was successfully ${editCategory ? 'updated' : 'created'}.`
      });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editCategory ? 'update' : 'create'} category`,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (values: unknown) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editCategory ? 'Edit' : 'Add'} Category</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input type="color" {...field} className="w-12 h-10 p-1" />
                      <Input {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. home, shopping-cart, etc." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : editCategory ? 'Update' : 'Add'} Category
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}