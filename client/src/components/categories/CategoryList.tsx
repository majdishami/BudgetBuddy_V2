import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import type { Category } from "@shared/schema";
import { fetchCategories } from "../../lib/queryClient"; // Correct import path
import { useEffect } from "react"; // Import useEffect

interface CategoryListProps {
  open: boolean;
  onClose: () => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export default function CategoryList({ open, onClose, onEdit, onDelete }: CategoryListProps) {
  const { data: categories, isLoading, error } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: fetchCategories, // Use the fetchCategories function here
  });

  // Use useEffect to handle side effects like logging
  useEffect(() => {
    if (categories) {
      console.log('Categories fetched successfully:', categories);
    }
  }, [categories]);

  useEffect(() => {
    if (error) {
      console.error('Error fetching categories:', error);
    }
  }, [error]);

  // Helper function to select emoji based on category name
  const getEmoji = (name: string | undefined): string => {
    if (!name) return "💰"; // default emoji if name is undefined

    const lowerName = name.toLowerCase();
    if (lowerName.includes("rent")) return "🏠";
    if (lowerName.includes("grocer")) return "🛒";
    if (lowerName.includes("debt") || lowerName.includes("loan")) return "💳";
    if (lowerName.includes("car") || lowerName.includes("auto")) return "🚗";
    if (lowerName.includes("maid") || lowerName.includes("clean")) return "🧹";
    if (lowerName.includes("credit")) return "💳";
    if (lowerName.includes("gas")) return "⛽";
    if (lowerName.includes("tv") || lowerName.includes("sling")) return "📺";
    if (lowerName.includes("internet") || lowerName.includes("cox")) return "🌐";
    if (lowerName.includes("water")) return "💧";
    if (lowerName.includes("electric")) return "⚡";
    if (lowerName.includes("insur")) return "🛡️";
    if (lowerName.includes("misc")) return "📦";
    return "💰"; // default emoji
  };

  if (isLoading) {
    return <div>Loading categories...</div>;
  }

  if (error) {
    return <div>Error loading categories: {error.message}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Categories</DialogTitle>
        </DialogHeader>

        <div className="relative overflow-x-auto max-h-[calc(80vh-8rem)]">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Icon</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories?.map((category) => {
                if (!category.name) return null; // Skip rendering if name is undefined

                return (
                  <TableRow key={category.id}>
                    <TableCell>{category.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: category.color }} />
                        {category.color}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getEmoji(category.name)}</span>
                        <span>{category.icon}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => onEdit(category)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => onDelete(category)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
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