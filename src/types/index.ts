export type RoleCode = 'administrador' | 'analista' | 'jefe_logistica';

export const ROLE_LABELS: Record<RoleCode, string> = {
  administrador: 'Administrador de Sistemas',
  analista: 'Analista de Inventarios',
  jefe_logistica: 'Jefe de Logística',
};

export interface UserProfile {
  id_usuario: number;
  correo: string;
  nombre_completo: string;
  rol: RoleCode;
  estado: boolean;
  creado_en?: string;
  ultimo_acceso?: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginResponse extends AuthTokens {
  user: UserProfile;
}

export interface ActionStatusResponse {
  success: boolean;
  message: string;
}

export interface ApiErrorDetail {
  code?: string;
  message: string;
  details?: unknown;
}
