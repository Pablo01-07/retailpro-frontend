import { apiClient } from './client';

export interface AuditLogResponse {
  id_auditoria: number;
  id_usuario?: number | null;
  accion: string;
  modulo_afectado: string;
  fecha_hora: string;
  detalle?: Record<string, unknown> | null;
}

export interface AuditKPIsResponse {
  total_actions: number;
  successful_actions: number;
  success_rate_pct: number;
  failed_actions: number;
  failure_rate_pct: number;
  active_users: number;
}

export interface AuditListResponse {
  items: AuditLogResponse[];
  total: number;
  page: number;
  size: number;
  pages: number;
  kpis: AuditKPIsResponse;
}

export interface AuditFilterParams {
  page?: number;
  size?: number;
  id_usuario?: number;
  accion?: string;
  modulo_afectado?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}

export const auditApi = {
  listAuditLogs: async (params?: AuditFilterParams): Promise<AuditListResponse> => {
    const res = await apiClient.get<AuditListResponse>('/auditoria', { params });
    return res.data;
  },

  exportarCsv: async (): Promise<string> => {
    const res = await apiClient.get<string>('/auditoria/exportar');
    return res.data;
  },
};
