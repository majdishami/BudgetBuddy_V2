import { QueryClient, QueryFunction } from "@tanstack/react-query";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
if (!BACKEND_URL) {
  throw new Error("VITE_BACKEND_URL environment variable is not set");
}

console.log(`Backend URL: ${BACKEND_URL}`);

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.clone().text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export type ApiRequestParams<T = any> = {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: T;
};

export async function apiRequest<T = any, U = any>({ 
  url, 
  method, 
  headers, 
  body 
}: ApiRequestParams<U>): Promise<T> {
  const fullUrl = `${BACKEND_URL}${url}`;
  console.log(`Making API request to ${fullUrl} with method ${method}`);

  try {
    const res = await fetch(fullUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);

    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return await res.json();
    }
    
    return await res.text() as unknown as T;
  } catch (error) {
    console.error(`API request failed for ${fullUrl}:`, error);
    throw error;
  }
}

// Properly typed getQueryFn with generic parameter
export function getQueryFn<T>(options: {
  on401: "returnNull" | "throw";
}): QueryFunction<T> {
  return async ({ queryKey, signal }) => {
    const relativeUrl = queryKey[0] as string;
    const fullUrl = `${BACKEND_URL}${relativeUrl}`;
    console.log("Fetching:", fullUrl);

    try {
      const res = await fetch(fullUrl, {
        credentials: "include",
        signal,
      });

      if (options.on401 === "returnNull" && res.status === 401) {
        return null as unknown as T;
      }

      await throwIfResNotOk(res);
      
      const contentType = res.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        return await res.json();
      }
      
      return await res.text() as unknown as T;
    } catch (error) {
      console.error(`API Error for ${fullUrl}:`, error);
      throw error;
    }
  };
}

// Example fetch functions with proper typing
export const fetchExpenses = async (): Promise<Expense[]> => {
  return apiRequest<Expense[]>({ 
    url: '/api/expenses', 
    method: 'GET' 
  });
};

export const fetchIncomes = async (): Promise<Income[]> => {
  return apiRequest<Income[]>({ 
    url: '/api/incomes', 
    method: 'GET' 
  });
};

export const fetchCategories = async (): Promise<Category[]> => {
  console.log('Fetching categories...');
  const data = await apiRequest<Category[]>({ 
    url: '/api/categories', 
    method: 'GET' 
  });
  console.log('Fetched categories:', data);
  return data;
};

// Optimized query client configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      retry: (failureCount, error) => {
        if ((error as Error).message.includes('401')) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: false,
    },
  },
});

// Type definitions
interface Expense {
  id: number;
  amount: number;
  date: string;
  description: string;
  category_id: number;
  user_id: number;
}

interface Income {
  id: number;
  amount: number;
  date: string;
  source: string;
  user_id: number;
}

interface Category {
  id: number;
  name: string;
  color?: string;
  icon?: string;
}

// Utility functions
export const apiPost = async <T = any, U = any>(url: string, body: U): Promise<T> => {
  return apiRequest<T, U>({
    url,
    method: 'POST',
    body
  });
};

export const apiPut = async <T = any, U = any>(url: string, body: U): Promise<T> => {
  return apiRequest<T, U>({
    url,
    method: 'PUT',
    body
  });
};

export const apiDelete = async <T = any>(url: string): Promise<T> => {
  return apiRequest<T>({
    url,
    method: 'DELETE'
  });
};