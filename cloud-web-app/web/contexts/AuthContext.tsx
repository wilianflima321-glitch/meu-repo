// g:\\repo\\cloud-web-app\\web\\contexts\\AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, APIError } from '../lib/api-client';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('aethel-token');
      if (storedToken) {
        apiClient.setToken(storedToken);
        setToken(storedToken);
        try {
          const profile = await apiClient.getProfile();
          setUser(profile);
        } catch (e) {
          // Token inválido/expirado -> limpa e segue como não autenticado.
          console.warn('Failed to load profile, clearing token', e);
          apiClient.logout();
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };
    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const { access_token, user } = await apiClient.login(email, password);
      setUser(user);
      setToken(access_token);
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
      throw err; // Re-throw to be caught by the form handler
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const { access_token, user } = await apiClient.register(email, password, name);
      setUser(user);
      setToken(access_token);
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    apiClient.logout();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
