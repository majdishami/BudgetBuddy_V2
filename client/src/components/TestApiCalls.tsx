import React, { useEffect, useState } from "react";
import { fetchExpenses, fetchIncomes, fetchCategories } from "../lib/queryClient"; // Use relative path

const TestApiCalls: React.FC = () => {
  const [expenses, setExpenses] = useState(null);
  const [incomes, setIncomes] = useState(null);
  const [categories, setCategories] = useState(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const expensesData = await fetchExpenses();
        setExpenses(expensesData);
      } catch (err) {
        setError(`Error fetching expenses: ${(err as Error).message}`);
      }

      try {
        const incomesData = await fetchIncomes();
        setIncomes(incomesData);
      } catch (err) {
        setError(`Error fetching incomes: ${(err as Error).message}`);
      }

      try {
        const categoriesData = await fetchCategories();
        setCategories(categoriesData);
      } catch (err) {
        setError(`Error fetching categories: ${(err as Error).message}`);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h1>Test API Calls</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <h2>Expenses</h2>
      <pre>{JSON.stringify(expenses, null, 2)}</pre>
      <h2>Incomes</h2>
      <pre>{JSON.stringify(incomes, null, 2)}</pre>
      <h2>Categories</h2>
      <pre>{JSON.stringify(categories, null, 2)}</pre>
    </div>
  );
};

export default TestApiCalls;