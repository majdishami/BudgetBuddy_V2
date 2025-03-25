import { apiRequest } from './queryClient';
import { queryClient } from './queryClient';
import { format } from 'date-fns';

export async function backupData() {
  try {
    // Fetch all data
    const expenses = await apiRequest({ 
      url: '/api/expenses',
      method: 'GET'
    });
    const incomes = await apiRequest({ 
      url: '/api/incomes',
      method: 'GET'
    });
    const categories = await apiRequest({ 
      url: '/api/categories',
      method: 'GET'
    });

    // Create backup object
    const backup = {
      expenses,
      incomes,
      categories,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };

    // Convert to JSON and create blob
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);

    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-backup-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.json`;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return true;
  } catch (error) {
    console.error('Backup failed:', error);
    throw new Error('Failed to backup data');
  }
}

export async function validateBackupFile(file: File): Promise<{
  isValid: boolean;
  summary: {
    expenses: number;
    incomes: number;
    categories: number;
    timestamp: string;
  };
}> {
  try {
    const content = await file.text();
    const backup = JSON.parse(content);

    // Validate backup format
    if (!backup.version || !backup.timestamp || 
        !backup.expenses || !backup.incomes || !backup.categories) {
      throw new Error('Invalid backup file format');
    }

    // Check if arrays are present and have expected structure
    if (!Array.isArray(backup.expenses) || !Array.isArray(backup.incomes) || !Array.isArray(backup.categories)) {
      throw new Error('Invalid data structure in backup file');
    }

    return {
      isValid: true,
      summary: {
        expenses: backup.expenses.length,
        incomes: backup.incomes.length,
        categories: backup.categories.length,
        timestamp: backup.timestamp
      }
    };
  } catch (error) {
    console.error('Validation failed:', error);
    throw new Error('Invalid backup file');
  }
}

export async function restoreData(file: File) {
  try {
    // First validate the backup file
    const validation = await validateBackupFile(file);
    if (!validation.isValid) {
      throw new Error('Invalid backup file');
    }

    const content = await file.text();
    const backup = JSON.parse(content);

    // Restore data in sequence
    await apiRequest({
      url: '/api/categories/restore',
      method: 'POST',
      body: JSON.stringify({ categories: backup.categories }), // Convert to JSON string
      headers: {
        'Content-Type': 'application/json'
      }
    });

    await apiRequest({
      url: '/api/expenses/restore',
      method: 'POST',
      body: JSON.stringify({ expenses: backup.expenses }), // Convert to JSON string
      headers: {
        'Content-Type': 'application/json'
      }
    });

    await apiRequest({
      url: '/api/incomes/restore',
      method: 'POST',
      body: JSON.stringify({ incomes: backup.incomes }), // Convert to JSON string
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Invalidate all queries to refresh data
    await queryClient.invalidateQueries();

    return true;
  } catch (error) {
    console.error('Restore failed:', error);
    throw new Error('Failed to restore data');
  }
}