import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, RoleCode } from '@/types';
import { authApi, LoginPayload } from '@/api/auth';
import {
  setAccessToken,
  setStoredRefreshToken,
  getStoredRefreshToken,
  clearAuthSession,
  API_BASE_URL,
} from '@/api/client';
import axios from 'axios';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<UserProfile>;
  logout: () => Promise<void>;
  hasRole: (roles: RoleCode | RoleCode[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedRefreshToken = getStoredRefreshToken();
      if (!storedRefreshToken) {
        setIsLoading(false);
        return;
      }

      try {
        const refreshResponse = await axios.post<{
          access_token: string;
          refresh_token: string;
        }>(`${API_BASE_URL}/auth/refresh`, { refresh_token: storedRefreshToken });

        const { access_token, refresh_token } = refreshResponse.data;
        setAccessToken(access_token);
        setStoredRefreshToken(refresh_token);
        setTokenState(access_token);

        const profile = await authApi.getCurrentUser();
        setUser(profile);
      } catch (err) {
        console.warn('No se pudo restaurar la sesión:', err);
        clearAuthSession();
        setUser(null);
        setTokenState(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (payload: LoginPayload): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const response = await authApi.login(payload);
      const { access_token, refresh_token, user: profile } = response;

      setAccessToken(access_token);
      setStoredRefreshToken(refresh_token);
      setTokenState(access_token);
      setUser(profile);

      return profile;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await authApi.logout();
      }
    } catch (err) {
      console.warn('Error al notificar logout al backend:', err);
    } finally {
      clearAuthSession();
      setUser(null);
      setTokenState(null);
    }
  }, [token]);

  const hasRole = useCallback(
    (roles: RoleCode | RoleCode[]): boolean => {
      if (!user) return false;
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      return allowedRoles.includes(user.rol);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
