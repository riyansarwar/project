import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { queryClient } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "teacher" | "student";
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, rememberMe?: boolean, role?: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string, role: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  updateUser: (patch: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    // Check both localStorage (remember me) and sessionStorage (session only)
    const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
    if (token) {
      // Verify token with server
      fetch("/api/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          throw new Error("Invalid token");
        })
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          localStorage.removeItem("auth_token");
          sessionStorage.removeItem("auth_token");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string, rememberMe: boolean = false, role?: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, role }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }

      const { token, user: userData } = await response.json();
      
      // Store token based on remember me preference
      if (rememberMe) {
        localStorage.setItem("auth_token", token);
      } else {
        sessionStorage.setItem("auth_token", token);
      }
      
      setUser(userData);
      
      // Clear any cached queries
      queryClient.clear();
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, firstName: string, lastName: string, role: string, username: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          role,
          username
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }

      const { token, user: userData } = await response.json();
      localStorage.setItem("auth_token", token);
      setUser(userData);
      
      // Clear any cached queries
      queryClient.clear();
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_token");
    setUser(null);
    queryClient.clear();
  };

  // Update auth user locally and keep cache in sync
  const updateUser = (patch: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
    queryClient.setQueryData(["/api/user"], (oldData: any) => (oldData ? { ...oldData, ...patch } : oldData));
  };

  // Re-fetch current user from server
  const refreshUser = async () => {
    const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
    if (!token) return;
    const res = await fetch("/api/user", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setUser(data);
      queryClient.setQueryData(["/api/user"], data);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}