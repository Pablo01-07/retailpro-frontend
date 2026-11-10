import { apiClient } from './client';
import { PronosticoDiaItem, PronosticoSkuDetalle } from '@/types';

export type { PronosticoDiaItem, PronosticoSkuDetalle };

export interface FactoresShapItem {
  feature: string;
  impacto: number;
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
  estado?: string;
  pronostico_disponible?: boolean;
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
  listPronosticos: async (
    categoria?: string,
    incluirSinPronostico?: boolean
  ): Promise<PronosticoListResponse> => {
    const params: Record<string, any> = {};
    if (categoria) params.categoria = categoria;
    if (incluirSinPronostico !== undefined) params.incluir_sin_pronostico = incluirSinPronostico;
    const res = await apiClient.get<PronosticoListResponse>('/pronosticos', {
      params: Object.keys(params).length > 0 ? params : undefined,
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
