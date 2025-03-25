import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.clone().text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export type ApiRequestParams = {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
};

export async function apiRequest({ url, method, headers, body }: ApiRequestParams): Promise<any> {
  console.log(`Making API request to ${url} with method ${method}`);
  const res = await fetch(`http://localhost:3000${url}`, {
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
  if (contentType && contentType.includes("application/json")) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (error) {
      console.error(`Failed to parse JSON response for ${url}:`, text);
      throw new Error(`Failed to parse JSON response for ${url}: ${text}`);
    }
  } else {
    const text = await res.text();
    console.error(`Unexpected response for ${url}:`, text);
    throw new Error(`Unexpected response for ${url}: ${text}`);
  }
}

export const getQueryFn: <T>(options: {
  on401: "returnNull" | "throw";
}) => QueryFunction<T> =
  ({ on401 }) =>
  async ({ queryKey }) => {
    const relativeUrl = queryKey[0] as string;
    const url = `http://localhost:3000${relativeUrl}`;
    console.log("Fetching:", url);

    try {
      const res = await fetch(url, {
        credentials: "include",
      });

      if (on401 === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const text = await res.text();
        console.log(`Response for ${url}:`, text);
        try {
          return JSON.parse(text);
        } catch (error) {
          console.error(`Failed to parse JSON response for ${url}:`, text);
          throw new Error(`Failed to parse JSON response for ${url}: ${text}`);
        }
      } else {
        const text = await res.text();
        console.error(`Unexpected response for ${url}:`, text);
        throw new Error(`Unexpected response for ${url}: ${text}`);
      }
    } catch (error) {
      console.error(`API Error for ${url}:`, error);
      throw error;
    }
  };

// Example fetch functions
export const fetchExpenses = async () => {
  return await apiRequest({ url: '/api/expenses', method: 'GET' });
};

export const fetchIncomes = async () => {
  return await apiRequest({ url: '/api/incomes', method: 'GET' });
};

export const fetchCategories = async () => {
  console.log('Fetching categories...');
  const data = await apiRequest({ url: '/api/categories', method: 'GET' });
  console.log('Fetched categories:', data);
  return data;
};

// Optimized query client configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: 30000, // 30 seconds
      refetchOnWindowFocus: true,
      staleTime: 30000, // 30 seconds
      retry: 1,
      gcTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: false,
    },
  },
});