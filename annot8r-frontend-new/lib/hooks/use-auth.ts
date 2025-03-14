"use client";

/**
 * Authentication hooks for client components
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AuthUser, LoginRequest, UserRole } from "@/lib/types";
import { clientLogin, clientLogout } from "../api/auth";

/**
 * Hook for handling authentication state and actions
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  /**
   * Load user from localStorage on mount
   */
  useEffect(() => {
    const loadUser = () => {
      setIsLoading(true);
      try {
        const userInfo = localStorage.getItem("user_info");
        if (userInfo) {
          setUser(JSON.parse(userInfo) as AuthUser);
        }
      } catch (err) {
        console.error("Failed to load user from localStorage:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  /**
   * Login function
   */
  const login = useCallback(
    async (credentials: LoginRequest) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await clientLogin(credentials);

        if (response.success && response.data) {
          setUser(response.data.user);

          // Redirect based on user role
          if (
            response.data.user.role === UserRole.ADMIN ||
            response.data.user.role === UserRole.SUPER_ADMIN
          ) {
            router.push("/admin");
          } else {
            router.push("/dashboard");
          }

          return true;
        } else {
          setError(response.error || "Login failed");
          return false;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Login failed";
        setError(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  /**
   * Logout function
   */
  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      await clientLogout();
      setUser(null);
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    logout,
  };
}

/**
 * Hook to check if the user is an admin
 */
export function useIsAdmin() {
  const { user, isLoading } = useAuth();

  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

  return {
    isAdmin,
    isSuperAdmin: user?.role === UserRole.SUPER_ADMIN,
    isLoading,
  };
}

/**
 * Hook to check if the user is an office user
 */
export function useIsOfficeUser() {
  const { user, isLoading } = useAuth();

  return {
    isOfficeUser: user?.isOfficeUser || false,
    isLoading,
  };
}
