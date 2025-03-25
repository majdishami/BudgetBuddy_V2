import { pgTable, text, serial, decimal, date, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Expense frequency type
export const FrequencyType = z.enum(['MONTHLY', 'YEARLY', 'ONCE']);
export type Frequency = z.infer<typeof FrequencyType>;

// Income frequency type
export const IncomeFrequencyType = z.enum(['BIWEEKLY', 'TWICE_MONTHLY', 'MONTHLY', 'ONCE']);
export type IncomeFrequency = z.infer<typeof IncomeFrequencyType>;

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).notNull(),
  icon: varchar("icon", { length: 50 }).notNull()
});

// Expenses table
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  frequency: varchar("frequency", { length: 20 }).notNull(),
  categoryId: serial("category_id").references(() => categories.id).notNull()
});

// Incomes table
export const incomes = pgTable("incomes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  frequency: varchar("frequency", { length: 20 }).notNull(),
  source: varchar("source", { length: 50 }).notNull()
});

// Schema types
export type Category = typeof categories.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Income = typeof incomes.$inferSelect;

// Custom insert schemas with proper type handling
export const insertCategorySchema = createInsertSchema(categories);

// Custom expense insert schema with proper type handling
export const insertExpenseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.string().or(z.number()).transform(val => String(val)),
  date: z.string().or(z.date()).transform(val => 
    typeof val === 'string' ? val : val.toISOString().split('T')[0]
  ),
  frequency: FrequencyType,
  categoryId: z.string().or(z.number()).transform(val => Number(val))
});

// Add specific income schema validation
export const insertIncomeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.string().or(z.number()).transform(val => String(val)),
  date: z.string().or(z.date()).transform(val => 
    typeof val === 'string' ? val : val.toISOString().split('T')[0]
  ),
  frequency: IncomeFrequencyType,
  source: z.string()
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type InsertIncome = z.infer<typeof insertIncomeSchema>;