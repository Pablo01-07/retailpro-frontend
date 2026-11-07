import { apiClient } from './client';
import { RoleCode } from '@/types';

export interface RoleOption {
  code: RoleCode;
  name: string;
  description: string;
}

export interface UserResponse {
  id_usuario: number;
  correo: string;
  nombre_completo: string;
  rol: RoleCode;
  estado: boolean;
  fecha_creacion?: string;
  creado_en?: string;
  ultimo_acceso?: string | null;
}

export interface UserListResponse {
  items: UserResponse[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface UserCreate {
  nombre_completo: string;
  correo: string;
  rol: RoleCode;
  estado: boolean;
  password?: string;
}

export interface UserUpdate {
  nombre_completo?: string;
  correo?: string;
  rol?: RoleCode;
  estado?: boolean;
  password?: string;
}

export interface UserFilterParams {
  page?: number;
  size?: number;
  rol?: string;
  estado?: boolean;
  search?: string;
}

export const usersApi = {
  getRoles: async (): Promise<RoleOption[]> => {
    const res = await apiClient.get<RoleOption[]>('/usuarios/roles');
    return res.data;
  },

  listUsers: async (params?: UserFilterParams): Promise<UserListResponse> => {
    const res = await apiClient.get<UserListResponse>('/usuarios', { params });
    return res.data;
  },

  getUser: async (userId: number): Promise<UserResponse> => {
    const res = await apiClient.get<UserResponse>(`/usuarios/${userId}`);
    return res.data;
  },

  createUser: async (payload: UserCreate): Promise<UserResponse> => {
    const res = await apiClient.post<UserResponse>('/usuarios', payload);
    return res.data;
  },

  updateUser: async (userId: number, payload: UserUpdate): Promise<UserResponse> => {
    const res = await apiClient.put<UserResponse>(`/usuarios/${userId}`, payload);
    return res.data;
  },

  deactivateUser: async (userId: number): Promise<UserResponse> => {
    const res = await apiClient.delete<UserResponse>(`/usuarios/${userId}`);
    return res.data;
  },
};
