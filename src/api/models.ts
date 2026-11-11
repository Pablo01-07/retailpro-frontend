import { apiClient } from './client';

export interface FeatureImportanceItem {
  feature: string;
  importancia: number;
  descripcion?: string | null;
}

export interface FichaModeloResponse {
  id_modelo: number;
  version: string;
  algoritmo: string;
  estado: string;
  fecha_entrenamiento: string;
  motivo_entrenamiento?: string | null;
  mae?: number | null;
  mape?: number | null;
  mape_14d?: number | null;
  rmse?: number | null;
  wape?: number | null;
  cobertura_intervalo_95?: number | null;
  umbral_mape_max: number;
  cumple_meta: boolean;
  parametros?: Record<string, unknown>;
  importancia_variables: FeatureImportanceItem[];
}

export interface MapeMensualMonitoreoItem {
  periodo: string;
  corte: string;
  mape: number;
  mape_14d?: number | null;
  rmse: number;
  mae: number;
  umbral_mape: number;
  estado_alerta: string;
}

export interface ModeloMonitoreoResponse {
  version_activa: string;
  mape_promedio_historico: number;
  mape_14d?: number | null;
  mape_14d_promedio_historico?: number | null;
  umbral_mape_max: number;
  alerta_degradacion: boolean;
  total_cortes_evaluados: number;
  cobertura_intervalo_95?: number | null;
  cobertura_fuera_muestra?: number | null;
  serie_mensual: MapeMensualMonitoreoItem[];
  proximo_reentrenamiento_programado?: string | null;
}

export interface ModeloHistorialItem {
  id_modelo: number;
  version: string;
  fecha_entrenamiento: string;
  motivo_entrenamiento?: string | null;
  mae?: number | null;
  mape?: number | null;
  mape_14d?: number | null;
  rmse?: number | null;
  wape?: number | null;
  estado: string;
  observacion?: string | null;
}

export interface MetricasModeloItem {
  id_modelo: number;
  version: string;
  estado: string;
  mae?: number | null;
  mape?: number | null;
  rmse?: number | null;
  wape?: number | null;
  mape_14d?: number | null;
  cobertura_intervalo_95?: number | null;
}

export interface DiferenciaMetricasItem {
  mape_14d?: number | null;
  mape?: number | null;
  mae?: number | null;
  rmse?: number | null;
  wape?: number | null;
  cobertura_intervalo_95?: number | null;
}

export interface CorteComparacionItem {
  corte_idx: number;
  periodo: string;
  mape_14d_candidato?: number | null;
  mape_14d_activa?: number | null;
  diferencia?: number | null;
}

export interface ComparacionModeloResponse {
  id_candidato: number;
  version_candidato: string;
  id_activa?: number | null;
  version_activa?: string | null;
  candidato: MetricasModeloItem;
  activa?: MetricasModeloItem | null;
  diferencia: DiferenciaMetricasItem;
  cortes: CorteComparacionItem[];
  cumple_umbral: boolean;
  mejora_vigente: boolean;
  comparacion_vigente?: 'mejora' | 'equivalente' | 'empeora' | string;
  umbral_mape: number;
  umbral_mape_evaluacion?: number | null;
}

export interface PublicarModeloResponse {
  mensaje: string;
  id_modelo: number;
  version: string;
  estado: string;
  observacion?: string | null;
}

export interface DescartarModeloResponse {
  mensaje: string;
  id_modelo: number;
  version: string;
  estado: string;
  observacion?: string | null;
}

export interface ReevaluarModeloResponse {
  mensaje: string;
  id_modelo: number;
  version: string;
  mape_14d?: number | null;
  mape?: number | null;
  mae?: number | null;
  rmse?: number | null;
  wape?: number | null;
  cobertura_intervalo_95?: number | null;
  cortes_evaluados: number;
}

export const modelsApi = {
  getFichaModeloActivo: async (): Promise<FichaModeloResponse> => {
    const res = await apiClient.get<FichaModeloResponse>('/modelos/activa');
    return res.data;
  },

  getMonitoreoModelo: async (): Promise<ModeloMonitoreoResponse> => {
    const res = await apiClient.get<ModeloMonitoreoResponse>('/modelos/monitoreo');
    return res.data;
  },

  listHistorialModelos: async (): Promise<ModeloHistorialItem[]> => {
    const res = await apiClient.get<ModeloHistorialItem[]>('/modelos/historial');
    return res.data;
  },

  activarVersionModelo: async (idModelo: number): Promise<{ mensaje: string; version_activa: string }> => {
    const res = await apiClient.patch<{ mensaje: string; version_activa: string }>(
      `/modelos/${idModelo}/activar`
    );
    return res.data;
  },

  triggerReentrenamiento: async (motivo?: string): Promise<{ mensaje: string }> => {
    const res = await apiClient.post<{ mensaje: string }>('/modelos/entrenar', {
      motivo: motivo || 'reentrenamiento_manual',
    });
    return res.data;
  },

  getComparacionModelo: async (idModelo: number): Promise<ComparacionModeloResponse> => {
    const res = await apiClient.get<ComparacionModeloResponse>(`/modelos/${idModelo}/comparacion`);
    return res.data;
  },

  publicarModelo: async (idModelo: number): Promise<PublicarModeloResponse> => {
    const res = await apiClient.post<PublicarModeloResponse>(`/modelos/${idModelo}/publicar`);
    return res.data;
  },

  descartarModelo: async (idModelo: number, comentario: string): Promise<DescartarModeloResponse> => {
    const res = await apiClient.post<DescartarModeloResponse>(`/modelos/${idModelo}/descartar`, {
      comentario,
    });
    return res.data;
  },

  reevaluarModeloActivo: async (): Promise<ReevaluarModeloResponse> => {
    const res = await apiClient.post<ReevaluarModeloResponse>('/modelos/activa/reevaluar');
    return res.data;
  },
};
