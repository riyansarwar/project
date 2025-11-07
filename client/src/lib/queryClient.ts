import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Set up the API URL based on environment
// When running separately: frontend on 3000, backend on 5000
// When running combined: both on the same port
// In production: both served from the same domain
// Using relative URLs for unified server

/**
 * Get the authorization header with JWT token
 */
function getAuthHeaders(): Record<string, string> {
  // Check both localStorage (remember me) and sessionStorage (session only)
  const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
  return token 
    ? { Authorization: `Bearer ${token}` }
    : {};
}

/**
 * Throws an error if the response is not OK
 * @param res The fetch Response object
 * @throws Error with status code and message if response is not OK
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Makes an API request to the backend
 * @param method HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param url API endpoint URL
 * @param data Optional data to send with the request
 * @returns Promise resolving to the Response object
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Use relative URLs for unified server
  const fullUrl = url;
  
  console.log(`Making ${method} request to: ${fullUrl}`);
  
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
  };
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Include cookies for authentication
  });

  await throwIfResNotOk(res);
  return res;
}

/**
 * Query function factory for TanStack Query
 * Handles different behaviors for unauthorized responses
 */
type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get the URL from the query key
    const endpoint = queryKey[0] as string;
    
    // Build the full URL if it's a relative path
    const fullUrl = endpoint.startsWith('http') ? endpoint : endpoint;
    
    try {
      const res = await fetch(fullUrl, {
        headers: {
          ...getAuthHeaders(),
        },
        credentials: "include", // Include cookies for authentication
      });

      // Handle unauthorized responses according to specified behavior
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`Unauthorized access to ${fullUrl}, returning null as configured`);
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error(`Error fetching ${fullUrl}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});