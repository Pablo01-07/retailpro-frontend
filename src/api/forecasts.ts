import { apiClient } from './client';

export interface FactoresShapItem {
  feature: string;
  impacto: number;
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
  fecha_generacion: string;
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

export interface PronosticoSkuResumen {
  id_producto: number;
  sku: string;
  nombre_producto: string;
  categoria: string;
  stock_actual: number;
  punto_reorden: number;
  demanda_total_proyectada_14d: number;
  probabilidad_quiebre: number;
  nivel_incertidumbre: string;
  fecha_generacion?: string | null;
  version_modelo?: string | null;
}

export interface PronosticoListResponse {
  total_skus: number;
  fecha_generacion?: string | null;
  version_modelo?: string | null;
  items: PronosticoSkuResumen[];
}

export interface TendenciaMensualItem {
  mes: string;
  venta_real: number;
  venta_proyectada: number;
  error_absoluto: number;
  mape_mensual: number;
}

export interface TendenciasResponse {
  total_meses: number;
  items: TendenciaMensualItem[];
}

export interface TendenciasFilterParams {
  categoria?: string;
  sku?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}

export const forecastsApi = {
  listPronosticos: async (categoria?: string): Promise<PronosticoListResponse> => {
    const res = await apiClient.get<PronosticoListResponse>('/pronosticos', {
      params: categoria ? { categoria } : undefined,
    });
    return res.data;
  },

  getForecastBySku: async (skuOrId: string): Promise<PronosticoSkuDetalle> => {
    const res = await apiClient.get<PronosticoSkuDetalle>(`/pronosticos/${encodeURIComponent(skuOrId)}`);
    return res.data;
  },

  getTendencias: async (params?: TendenciasFilterParams): Promise<TendenciasResponse> => {
    const res = await apiClient.get<TendenciasResponse>('/pronosticos/tendencias', {
      params,
    });
    return res.data;
  },
};
