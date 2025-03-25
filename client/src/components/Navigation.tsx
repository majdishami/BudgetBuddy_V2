import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { Moon, Sun } from "lucide-react"; // Import dark/light mode icons
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./ui/navigation-menu";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { useToast } from "../hooks/use-toast";
import { queryClient } from "../lib/queryClient";
import { apiRequest, ApiRequestParams } from "../lib/queryClient";
import ExpenseForm from "./transactions/ExpenseForm";
import ExpenseList from "./transactions/ExpenseList";
import ExpenseDelete from "./transactions/ExpenseDelete";
import IncomeForm from "./transactions/IncomeForm";
import IncomeList from "./transactions/IncomeList";
import IncomeDelete from "./transactions/IncomeDelete";
import CategoryForm from "./categories/CategoryForm";
import CategoryList from "./categories/CategoryList";
import CategoryDelete from "./categories/CategoryDelete";
import type { Category, Expense, Income } from "@shared/schema";
import ExpenseReport from "./transactions/ExpenseReport";
import { backupData, restoreData, validateBackupFile } from "../lib/dataSync";
import { format } from "date-fns";

export default function Navigation() {
  const [isDarkMode, setIsDarkMode] = useState(false); // State for dark mode
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showCategoryList, setShowCategoryList] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | undefined>();
  const [deleteCategory, setDeleteCategory] = useState<Category | undefined>();
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showExpenseList, setShowExpenseList] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | undefined>();
  const [deleteExpense, setDeleteExpense] = useState<Expense | undefined>();
  const [showExpenseReport, setShowExpenseReport] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showIncomeList, setShowIncomeList] = useState(false);
  const [editIncome, setEditIncome] = useState<Income | undefined>();
  const [deleteIncome, setDeleteIncome] = useState<Income | undefined>();
  const { toast } = useToast();

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    document.documentElement.classList.toggle("dark", newDarkMode);
    localStorage.setItem("darkMode", newDarkMode ? "enabled" : "disabled");
  };

  // Check for saved dark mode preference on mount
  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode === "enabled") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const handleEditCategory = (category: Category) => {
    setEditCategory(category);
    setShowCategoryForm(true);
    setShowCategoryList(false);
  };

  const handleDeleteCategory = (category: Category) => {
    setDeleteCategory(category);
    setShowCategoryList(false);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditExpense(expense);
    setShowExpenseForm(true);
    setShowExpenseList(false);
  };

  const handleDeleteExpense = (expense: Expense) => {
    setDeleteExpense(expense);
    setShowExpenseList(false);
  };

  const handleEditIncome = (income: Income) => {
    setEditIncome(income);
    setShowIncomeForm(true);
    setShowIncomeList(false);
  };

  const handleDeleteIncome = (income: Income) => {
    setDeleteIncome(income);
    setShowIncomeList(false);
  };

  const handleBackup = async () => {
    try {
      await backupData();
      toast({
        title: "Backup Successful",
        description: "Your data has been successfully backed up.",
      });
    } catch (error) {
      toast({
        title: "Backup Failed",
        description: "Failed to backup data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const [restorePreview, setRestorePreview] = useState<{
    isValid: boolean;
    summary: {
      expenses: number;
      incomes: number;
      categories: number;
      timestamp: string;
    };
  } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleRestore = () => {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const validation = await validateBackupFile(file);
        setRestorePreview(validation);
        setSelectedFile(file);
      } catch (error) {
        toast({
          title: "Invalid Backup File",
          description: "The selected file is not a valid backup file.",
          variant: "destructive",
        });
      }
    };

    input.click();
  };

  const handleConfirmRestore = async () => {
    if (!selectedFile) return;

    try {
      await restoreData(selectedFile);
      toast({
        title: "Restore Successful",
        description: "Your data has been successfully restored.",
      });
      setRestorePreview(null);
      setSelectedFile(null);
    } catch (error) {
      toast({
        title: "Restore Failed",
        description: "Failed to restore data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelRestore = () => {
    setRestorePreview(null);
    setSelectedFile(null);
  };

  const [showClearDataDialog, setShowClearDataDialog] = useState(false);

  const handleClearData = async () => {
    try {
      const params: ApiRequestParams = {
        url: '/api/clear-data',
        method: 'POST'
      };
      await apiRequest(params);
      // Invalidate all queries to refresh the data
      await queryClient.invalidateQueries();
      toast({
        title: "Data Cleared",
        description: "All data has been successfully cleared from the database.",
      });
      setShowClearDataDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="border-b">
      <div className="container mx-auto px-4 py-2">
        <NavigationMenu>
          <NavigationMenuList className="justify-start">
            <NavigationMenuItem>
              <Link href="/">
                <Button variant="link">Dashboard</Button>
              </Link>
            </NavigationMenuItem>

            <NavigationMenuItem className="relative">
              <NavigationMenuTrigger onClick={(e) => e.preventDefault()}>Expenses</NavigationMenuTrigger>
              <NavigationMenuContent className="absolute top-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2 z-40 bg-white">
                <div className="rounded-md border bg-popover p-4 shadow-md w-[200px] space-y-2">
                  <Button
                    onClick={() => setShowExpenseList(true)}
                    className="w-full"
                  >
                    List/Edit/Delete
                  </Button>
                  <Button
                    onClick={() => {
                      setEditExpense(undefined);
                      setShowExpenseForm(true);
                    }}
                    className="w-full"
                  >
                    Add
                  </Button>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem className="relative">
              <NavigationMenuTrigger onClick={(e) => e.preventDefault()}>Income</NavigationMenuTrigger>
              <NavigationMenuContent className="absolute top-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2 z-40 bg-white">
                <div className="rounded-md border bg-popover p-4 shadow-md w-[200px] space-y-2">
                  <Button
                    onClick={() => setShowIncomeList(true)}
                    className="w-full"
                  >
                    List/Edit/Delete
                  </Button>
                  <Button
                    onClick={() => {
                      setEditIncome(undefined);
                      setShowIncomeForm(true);
                    }}
                    className="w-full"
                  >
                    Add
                  </Button>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem className="relative">
              <NavigationMenuTrigger onClick={(e) => e.preventDefault()}>Categories</NavigationMenuTrigger>
              <NavigationMenuContent className="absolute top-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2 z-40 bg-white">
                <div className="rounded-md border bg-popover p-4 shadow-md w-[200px] space-y-2">
                  <Button
                    onClick={() => setShowCategoryList(true)}
                    className="w-full"
                  >
                    List/Edit/Delete
                  </Button>
                  <Button
                    onClick={() => {
                      setEditCategory(undefined);
                      setShowCategoryForm(true);
                    }}
                    className="w-full"
                  >
                    Add
                  </Button>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Link href="/reports">
                <Button variant="link">Reports</Button>
              </Link>
            </NavigationMenuItem>

            <NavigationMenuItem className="relative">
              <NavigationMenuTrigger onClick={(e) => e.preventDefault()}>Data Sync</NavigationMenuTrigger>
              <NavigationMenuContent className="absolute top-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2 z-40 bg-white">
                <div className="rounded-md border bg-popover p-4 shadow-md w-[200px] space-y-2">
                  <Button
                    onClick={handleBackup}
                    className="w-full"
                  >
                    Backup
                  </Button>
                  <Button
                    onClick={handleRestore}
                    className="w-full"
                  >
                    Restore
                  </Button>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Button
                variant="destructive"
                className="text-sm"
                onClick={() => setShowClearDataDialog(true)}
              >
                Clear Database
              </Button>
            </NavigationMenuItem>

            {/* Dark Mode Toggle Button */}
            <NavigationMenuItem>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* Existing dialogs and forms */}
      {showExpenseForm && (
        <ExpenseForm
          open={showExpenseForm}
          onClose={() => {
            setShowExpenseForm(false);
            setEditExpense(undefined);
          }}
          editExpense={editExpense}
        />
      )}

      {showExpenseList && (
        <ExpenseList
          open={showExpenseList}
          onClose={() => setShowExpenseList(false)}
          onEdit={handleEditExpense}
          onDelete={handleDeleteExpense}
        />
      )}

      {deleteExpense && (
        <ExpenseDelete
          open={!!deleteExpense}
          onClose={() => setDeleteExpense(undefined)}
          expense={deleteExpense}
        />
      )}

      {showIncomeForm && (
        <IncomeForm
          open={showIncomeForm}
          onClose={() => {
            setShowIncomeForm(false);
            setEditIncome(undefined);
          }}
          editIncome={editIncome} // Corrected prop
        />
      )}

      {showIncomeList && (
        <IncomeList
          open={showIncomeList}
          onClose={() => setShowIncomeList(false)}
          onEdit={handleEditIncome}
        />
      )}

      {deleteIncome && (
        <IncomeDelete
          open={!!deleteIncome}
          onClose={() => setDeleteIncome(undefined)}
          income={deleteIncome}
        />
      )}

      {showCategoryForm && (
        <CategoryForm
          open={showCategoryForm}
          onClose={() => {
            setShowCategoryForm(false);
            setEditCategory(undefined);
          }}
          editCategory={editCategory}
        />
      )}

      {showCategoryList && (
        <CategoryList
          open={showCategoryList}
          onClose={() => setShowCategoryList(false)}
          onEdit={handleEditCategory}
          onDelete={handleDeleteCategory}
        />
      )}

      {deleteCategory && (
        <CategoryDelete
          open={!!deleteCategory}
          onClose={() => setDeleteCategory(undefined)}
          category={deleteCategory}
        />
      )}

      {showExpenseReport && (
        <ExpenseReport
          open={showExpenseReport}
          onClose={() => setShowExpenseReport(false)}
          onReport={(expense) => {
            console.log('Generate report for expense:', expense);
          }}
        />
      )}

      {restorePreview && (
        <Dialog open={!!restorePreview} onOpenChange={handleCancelRestore}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Restore Backup</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Backup created on: {format(new Date(restorePreview.summary.timestamp), 'MMM dd, yyyy HH:mm')}
              </p>
              <div className="space-y-2">
                <p>This backup contains:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>{restorePreview.summary.categories} categories</li>
                  <li>{restorePreview.summary.expenses} expenses</li>
                  <li>{restorePreview.summary.incomes} incomes</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to restore this backup? This will replace your current data.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelRestore}>
                Cancel
              </Button>
              <Button onClick={handleConfirmRestore}>
                Restore Backup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={showClearDataDialog} onOpenChange={setShowClearDataDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Data</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your data including expenses, incomes, and categories.
              You can restore data later using a backup file, or manually add new data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}