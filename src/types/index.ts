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

export interface PronosticoDiaItem {
  horizonte_dias: number;
  fecha_objetivo: string;
  cantidad_proyectada: number;
  intervalo_confianza_inf: number;
  intervalo_confianza_sup: number;
  nivel_incertidumbre: string;
  explicacion_shap?: Record<string, unknown>;
}

export interface PronosticoSkuDetalle {
  id_producto: number;
  sku: string;
  nombre_producto: string;
  categoria: string;
  stock_actual: number;
  punto_reorden: number;
  demanda_total_proyectada_14d: number;
  probabilidad_quiebre: number;
  nivel_incertidumbre: string;
  pronostico_disponible: boolean;
  fecha_generacion?: string | null;
  id_modelo: number;
  version_modelo: string;
  mape_modelo?: number | null;
  serie_14_dias: PronosticoDiaItem[];
  historico_reciente: Array<{
    fecha: string;
    cantidad_vendida: number;
    precio: number;
  }>;
}
