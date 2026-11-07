import { apiClient } from './client';
import { LoginResponse, UserProfile, ActionStatusResponse } from '@/types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface PasswordRecoveryPayload {
  correo?: string;
  email?: string;
}

export interface PasswordResetPayload {
  token: string;
  nueva_contrasena: string;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/auth/login', payload);
    return res.data;
  },

  getCurrentUser: async (): Promise<UserProfile> => {
    const res = await apiClient.get<UserProfile>('/auth/me');
    return res.data;
  },

  logout: async (): Promise<ActionStatusResponse> => {
    const res = await apiClient.post<ActionStatusResponse>('/auth/logout');
    return res.data;
  },

  solicitarRecuperacion: async (correo: string): Promise<ActionStatusResponse> => {
    const res = await apiClient.post<ActionStatusResponse>('/auth/recuperar', { correo });
    return res.data;
  },

  requestPasswordRecovery: async (payload: PasswordRecoveryPayload): Promise<ActionStatusResponse> => {
    const correo = payload.correo || payload.email || '';
    const res = await apiClient.post<ActionStatusResponse>('/auth/recuperar', { correo });
    return res.data;
  },

  restablecerContrasena: async (payload: PasswordResetPayload): Promise<ActionStatusResponse> => {
    const res = await apiClient.post<ActionStatusResponse>('/auth/restablecer', payload);
    return res.data;
  },
};
