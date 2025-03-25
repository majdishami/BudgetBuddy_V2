import { pgTable, serial, varchar, decimal, date } from 'drizzle-orm/pg-core';
import { z } from 'zod';

// ======================
// Frequency Types
// ======================
export const FrequencyType = z.enum([
  'DAILY',
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'YEARLY',
  'ONE_TIME'
]);
export type Frequency = z.infer<typeof FrequencyType>;

// ======================
// Database Tables
// ======================
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).notNull(),
  icon: varchar("icon", { length: 50 }).notNull(),
  createdAt: date("created_at").defaultNow(),
  updatedAt: date("updated_at").defaultNow()
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  date: date("date").notNull(),
  frequency: varchar("frequency", { length: 20 }).notNull(),
  categoryId: serial("category_id").references(() => categories.id).notNull(),
  createdAt: date("created_at").defaultNow(),
  updatedAt: date("updated_at").defaultNow()
});

export const incomes = pgTable("incomes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  date: date("date").notNull(),
  frequency: varchar("frequency", { length: 20 }).notNull(),
  source: varchar("source", { length: 50 }),
  createdAt: date("created_at").defaultNow(),
  updatedAt: date("updated_at").defaultNow()
});

// ======================
// Base Types
// ======================
export type Category = typeof categories.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Income = typeof incomes.$inferSelect;

// ======================
// Frontend Types (with string dates)
// ======================
export interface FrontendCategory extends Omit<Category, 'createdAt'|'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

export interface FrontendExpense extends Omit<Expense, 'date'|'createdAt'|'updatedAt'> {
  date: string;
  createdAt: string;
  updatedAt: string;
  category?: FrontendCategory;
}

export interface FrontendIncome extends Omit<Income, 'date'|'createdAt'|'updatedAt'> {
  date: string;
  createdAt: string;
  updatedAt: string;
}

// ======================
// Report Types
// ======================
export interface ProcessedExpense extends FrontendExpense {
  dates: { date: string; isPending: boolean; amount: number }[];
  incurredAmount: number;
  pendingAmount: number;
  totalAmount: number;
}

export interface ProcessedIncome extends FrontendIncome {
  dates: { date: string; isPending: boolean; amount: number }[];
  incurredAmount: number;
  pendingAmount: number;
  totalAmount: number;
}