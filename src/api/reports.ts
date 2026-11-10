import { apiClient } from './client';

export interface ReporteHistorialItem {
  id_auditoria: number;
  nombre?: string;
  nombre_archivo: string;
  tipo?: string;
  tipo_reporte?: string;
  formato: string;
  tamano_bytes: number;
  fecha?: string;
  fecha_generacion?: string;
  url_descarga: string;
  usuario?: string;
  id_usuario?: number;
}

export interface ReporteHistorialResponse {
  items: ReporteHistorialItem[];
  total_reportes?: number;
  total?: number;
  page: number;
  limit: number;
  pages?: number;
}

export interface ReportePreviewItem {
  id_producto: number;
  sku: string;
  nombre_producto: string;
  categoria: string;
  stock_actual: number;
  punto_reorden: number;
  demanda_proyectada_14d: number;
  cantidad_sugerida: number;
  probabilidad_quiebre: number;
  nivel_incertidumbre: string;
}

export interface ReportePreviewResponse {
  total_registros: number;
  fecha_generacion: string;
  categoria_filtrada?: string | null;
  items: ReportePreviewItem[];
}

export interface ExportarReporteRequest {
  formato: 'csv' | 'xlsx' | 'pdf';
  tipo_reporte?: string;
  categoria?: string;
  sku?: string;
}

export interface ExportarReporteConFiltrosRequest {
  formato: 'csv' | 'xlsx' | 'pdf';
  categoria?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
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

export const reportsApi = {
  getHistorial: async (page = 1, limit = 20): Promise<ReporteHistorialResponse> => {
    const res = await apiClient.get<ReporteHistorialResponse>('/reportes/historial', {
      params: { page, limit },
    });
    return res.data;
  },

  getPreview: async (categoria?: string, sku?: string): Promise<ReportePreviewResponse> => {
    const params: Record<string, string> = {};
    if (categoria) params.categoria = categoria;
    if (sku) params.sku = sku;
    const res = await apiClient.get<ReportePreviewResponse>('/reportes/pronostico/preview', {
      params: Object.keys(params).length > 0 ? params : undefined,
    });
    return res.data;
  },

  exportarPronostico: async (
    payload: ExportarReporteRequest,
    sku?: string
  ): Promise<ExportarReporteResponse> => {
    const body = {
      ...payload,
      ...(sku ? { sku } : {}),
    };
    const res = await apiClient.post<ExportarReporteResponse>('/reportes/pronostico/export', body);
    return res.data;
  },

  exportarInventario: async (
    payload: ExportarReporteConFiltrosRequest
  ): Promise<ExportarReporteResponse> => {
    const res = await apiClient.post<ExportarReporteResponse>('/reportes/inventario/export', payload);
    return res.data;
  },

  exportarVentas: async (payload: ExportarReporteConFiltrosRequest): Promise<ExportarReporteResponse> => {
    const res = await apiClient.post<ExportarReporteResponse>('/reportes/ventas/export', payload);
    return res.data;
  },

  exportarIndicadores: async (
    payload: ExportarReporteConFiltrosRequest
  ): Promise<ExportarReporteResponse> => {
    const res = await apiClient.post<ExportarReporteResponse>('/reportes/indicadores/export', payload);
    return res.data;
  },
};
