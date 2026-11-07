import { apiClient } from './client';

export interface RecomendacionItem {
  id_pronostico: number;
  id_producto: number;
  sku: string;
  nombre_producto: string;
  categoria: string;
  stock_actual: number;
  punto_reorden: number;
  demanda_proyectada_14d: number;
  dias_cobertura: number;
  probabilidad_quiebre: number;
  cantidad_sugerida: number;
  cantidad_ajustada?: number | null;
  fecha_limite?: string | null;
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  motivo_prioridad: string;
}

export interface ReposicionListResponse {
  total_recomendaciones: number;
  fecha_generacion?: string | null;
  total_sugerido_unidades: number;
  items: RecomendacionItem[];
}

export interface ReposicionFilterParams {
  categoria?: string;
  prioridad?: string;
  solo_con_orden?: boolean;
  sku?: string;
  q?: string;
  fecha_limite_desde?: string;
  fecha_limite_hasta?: string;
}

export interface AjusteReposicionRequest {
  cantidad_ajustada: number;
  motivo_ajuste?: string;
}

export interface AjusteReposicionResponse {
  id_pronostico: number;
  id_producto: number;
  sku: string;
  cantidad_sugerida: number;
  cantidad_ajustada: number;
  mensaje: string;
}

export interface ExportarReposicionRequest {
  formato: 'xlsx' | 'csv';
  categoria?: string;
  prioridad?: string;
  solo_con_orden?: boolean;
  sku?: string;
  q?: string;
  fecha_limite_desde?: string;
  fecha_limite_hasta?: string;
}

export interface ExportarReporteResponse {
  id_reporte: string;
  formato: string;
  nombre_archivo: string;
  url_descarga: string;
  tamaño_bytes: number;
  fecha_generacion: string;
  mensaje: string;
}

export const replenishmentApi = {
  getRecomendaciones: async (params?: ReposicionFilterParams): Promise<ReposicionListResponse> => {
    const res = await apiClient.get<ReposicionListResponse>('/reposicion', {
      params,
    });
    return res.data;
  },

  ajustarCantidad: async (idPronostico: number, payload: AjusteReposicionRequest): Promise<AjusteReposicionResponse> => {
    const res = await apiClient.patch<AjusteReposicionResponse>(`/reposicion/${idPronostico}`, payload);
    return res.data;
  },

  exportar: async (payload: ExportarReposicionRequest): Promise<ExportarReporteResponse> => {
    const res = await apiClient.post<ExportarReporteResponse>('/reposicion/exportar', payload);
    return res.data;
  },
};
