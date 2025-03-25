
-- Budget Tracking Application Database Schema

-- Drop tables if they exist
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS incomes;
DROP TABLE IF EXISTS categories;

-- Create Categories Table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL,  -- Hex color code
    icon VARCHAR(50) NOT NULL
);

-- Create Expenses Table
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('MONTHLY', 'YEARLY', 'ONCE')),
    category_id INTEGER REFERENCES categories(id) NOT NULL
);

-- Create Incomes Table
CREATE TABLE incomes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('MONTHLY', 'BIWEEKLY', 'TWICE_MONTHLY', 'ONCE')),
    source VARCHAR(50) NOT NULL
);

-- Insert initial categories
INSERT INTO categories (name, color, icon) VALUES
('Rent', '#3B93F5', 'home'),
('Groceries', '#4CAF50', 'shopping-cart'),
('Loans', '#FF5722', 'credit-card'),
('Car Insurance', '#9C27B0', 'car'),
('House Cleaning', '#795548', 'trash'),
('Credit Cards', '#F44336', 'credit-card'),
('Entertainment', '#2196F3', 'tv'),
('Internet', '#00BCD4', 'wifi'),
('Phone', '#E91E63', 'phone'),
('Utilities', '#FFC107', 'zap'),
('Insurance', '#673AB7', 'shield'),
('Other', '#607D8B', 'more-horizontal');

-- Set the sequence values
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
SELECT setval('expenses_id_seq', 1);
SELECT setval('incomes_id_seq', 1);
