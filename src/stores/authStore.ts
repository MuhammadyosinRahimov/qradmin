'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Admin, AuthResponse } from '@/types';
import { adminLogin } from '@/lib/api';

interface AuthState {
  token: string | null;
  admin: Admin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  isSuperAdmin: () => boolean;
  getRestaurantId: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      admin: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await adminLogin(email, password);
          const data: AuthResponse = response.data;

          const admin: Admin = {
            id: data.adminId,
            email: data.email,
            name: data.name,
            role: data.role,
            restaurantId: data.restaurantId,
            restaurantName: data.restaurantName,
          };

          localStorage.setItem('admin_token', data.token);

          set({
            token: data.token,
            admin,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Ошибка авторизации',
            isLoading: false,
          });
          return false;
        }
      },

      logout: () => {
        localStorage.removeItem('admin_token');
        set({
          token: null,
          admin: null,
          isAuthenticated: false,
        });
      },

      clearError: () => set({ error: null }),

      isSuperAdmin: () => {
        const admin = get().admin;
        return admin?.role === 'Admin';
      },

      getRestaurantId: () => {
        const admin = get().admin;
        return admin?.restaurantId || null;
      },
    }),
    {
      name: 'admin-auth',
      partialize: (state) => ({
        token: state.token,
        admin: state.admin,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
