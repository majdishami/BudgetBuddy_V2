import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Validate and type environment variables
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
if (!BACKEND_URL) {
  throw new Error("VITE_BACKEND_URL environment variable is not set");
}

console.log(`Backend URL: ${BACKEND_URL}`);

// Enhanced error handling utility
async function throwIfResNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    let errorMessage = `${res.status}: ${res.statusText}`;
    try {
      const errorData = await res.clone().json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      const text = await res.clone().text();
      if (text) errorMessage = `${res.status}: ${text}`;
    }
    throw new Error(errorMessage);
  }
}

// Strongly typed API request parameters
export type ApiRequestParams<T = unknown> = {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: T;
  signal?: AbortSignal;
};

// Core API request function with enhanced typing
export async function apiRequest<T = unknown, U = unknown>({
  url,
  method,
  headers,
  body,
  signal
}: ApiRequestParams<U>): Promise<T> {
  const fullUrl = `${BACKEND_URL}${url}`;
  console.debug(`API Request: ${method} ${fullUrl}`);

  try {
    const res = await fetch(fullUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
      signal,
    });

    await throwIfResNotOk(res);

    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return (await res.json()) as T;
    }
    
    return (await res.text()) as unknown as T;
  } catch (error) {
    console.error(`API Request Failed (${method} ${url}):`, error);
    throw error instanceof Error ? error : new Error('Unknown API error occurred');
  }
}

// Typed query function factory
export function getQueryFn<T>(options: {
  on401?: "returnNull" | "throw";
} = { on401: "throw" }): QueryFunction<T> {
  return async ({ queryKey, signal }) => {
    const relativeUrl = queryKey[0] as string;
    const fullUrl = `${BACKEND_URL}${relativeUrl}`;
    console.debug(`Query Fetching: ${fullUrl}`);

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
      return contentType?.includes("application/json")
        ? res.json()
        : res.text();
    } catch (error) {
      console.error(`Query Error (${relativeUrl}):`, error);
      throw error;
    }
  };
}

// Domain-specific query functions
export const fetchExpenses = async (signal?: AbortSignal): Promise<Expense[]> => {
  return apiRequest<Expense[]>({ 
    url: '/api/expenses', 
    method: 'GET',
    signal
  });
};

export const fetchIncomes = async (signal?: AbortSignal): Promise<Income[]> => {
  return apiRequest<Income[]>({ 
    url: '/api/incomes', 
    method: 'GET',
    signal
  });
};

export const fetchCategories = async (signal?: AbortSignal): Promise<Category[]> => {
  const data = await apiRequest<Category[]>({ 
    url: '/api/categories', 
    method: 'GET',
    signal
  });
  console.debug('Fetched categories count:', data.length);
  return data;
};

// Configured query client instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      retry: (failureCount, error) => {
        const err = error as Error;
        if (err.message.includes('401') || err.message.includes('403')) {
          return false;
        }
        return failureCount < 3;
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

// CRUD utility functions
export const apiPost = async <T = unknown, U = unknown>(
  url: string, 
  body: U,
  signal?: AbortSignal
): Promise<T> => apiRequest<T, U>({ url, method: 'POST', body, signal });

export const apiPut = async <T = unknown, U = unknown>(
  url: string, 
  body: U,
  signal?: AbortSignal
): Promise<T> => apiRequest<T, U>({ url, method: 'PUT', body, signal });

export const apiDelete = async <T = unknown>(
  url: string,
  signal?: AbortSignal
): Promise<T> => apiRequest<T>({ url, method: 'DELETE', signal });

export const apiPatch = async <T = unknown, U = unknown>(
  url: string,
  body: U,
  signal?: AbortSignal
): Promise<T> => apiRequest<T, U>({ url, method: 'PATCH', body, signal });