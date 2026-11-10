import { apiClient } from './client';

export interface KpiItem {
  nombre: string;
  valor: string;
  valor_numerico: number;
  unidad?: string | null;
  tendencia_pct?: number | null;
  estado?: 'POSITIVO' | 'NEUTRO' | 'ALERTA' | null;
}

export interface CategoriaResumen {
  categoria: string;
  total_skus: number;
  stock_total: number;
  demanda_proyectada_14d: number;
  nivel_servicio_estimado_pct: number;
  alertas_quiebre: number;
  alertas_sobrestock: number;
}

export interface TopRiesgoQuiebreItem {
  sku: string;
  nombre: string;
  categoria: string;
  stock_actual: number;
  dias_cobertura: number;
  probabilidad_quiebre: number;
}

export interface TendenciaDiariaGeneralItem {
  tipo: 'historico' | 'proyectado';
  fecha: string;
  volumen: number;
}

export interface ProductoMasVendidoItem {
  sku: string;
  nombre: string;
  categoria: string;
  unidades_vendidas: number;
  ingresos_totales: number;
  unidades_periodo_anterior: number;
  variacion_pct: number;
  periodo_dias: number;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface DashboardResumenResponse {
  kpis: KpiItem[];
  categorias: CategoriaResumen[];
  top_riesgo_quiebre: TopRiesgoQuiebreItem[];
  tendencia_diaria_general: TendenciaDiariaGeneralItem[];
  productos_mas_vendidos?: ProductoMasVendidoItem[];
}

export interface DashboardPowerBiResponse {
  enabled: boolean;
  embed_url: string | null;
  mensaje: string;
}

export interface NivelServicioCategoriaItem {
  categoria: string;
  total_skus: number;
  skus_en_riesgo: number;
  stock_total: number;
  demanda_proyectada: number;
  fill_rate_estimado_pct: number;
  disponibilidad_catalogo_pct: number;
  cumple_meta: boolean;
}

export interface NivelServicioResponse {
  meta_referencial_pct: number;
  nivel_servicio_global_pct: number;
  disponibilidad_global_pct: number;
  total_skus: number;
  skus_disponibles: number;
  skus_en_riesgo: number;
  es_estimacion: boolean;
  nota_metodologica: string;
  almacenes: string[];
  almacen_seleccionado: string;
  categoria_filtrada?: string | null;
  sku_filtrado?: string | null;
  periodo_filtrado?: string | null;
  linea_base_historica_disponible?: boolean;
  mensaje_linea_base?: string | null;
  por_categoria: NivelServicioCategoriaItem[];
}

export interface NivelServicioFilterParams {
  sku?: string;
  categoria?: string;
  periodo?: string;
  almacen?: string;
}

export const dashboardApi = {
  getResumen: async (): Promise<DashboardResumenResponse> => {
    const res = await apiClient.get<DashboardResumenResponse>('/dashboard');
    return res.data;
  },

  getPowerBi: async (): Promise<DashboardPowerBiResponse> => {
    const res = await apiClient.get<DashboardPowerBiResponse>('/dashboard/powerbi');
    return res.data;
  },

  getNivelServicio: async (params?: NivelServicioFilterParams): Promise<NivelServicioResponse> => {
    const res = await apiClient.get<NivelServicioResponse>('/dashboard/nivel-servicio', {
      params,
    });
    return res.data;
  },

  getProductosMasVendidos: async (dias = 30): Promise<ProductoMasVendidoItem[]> => {
    const res = await apiClient.get<ProductoMasVendidoItem[]>('/dashboard/productos-mas-vendidos', {
      params: { dias },
    });
    return res.data;
  },
};
