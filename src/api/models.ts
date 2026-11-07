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
  rmse: number;
  mae: number;
  umbral_mape: number;
  estado_alerta: string;
}

export interface ModeloMonitoreoResponse {
  version_activa: string;
  mape_promedio_historico: number;
  umbral_mape_max: number;
  alerta_degradacion: boolean;
  total_cortes_evaluados: number;
  cobertura_intervalo_95?: number | null;
  cobertura_fuera_muestra?: number | null;
  serie_mensual: MapeMensualMonitoreoItem[];
}

export interface ModeloHistorialItem {
  id_modelo: number;
  version: string;
  fecha_entrenamiento: string;
  motivo_entrenamiento?: string | null;
  mae?: number | null;
  mape?: number | null;
  rmse?: number | null;
  wape?: number | null;
  estado: string;
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

  triggerReentrenamiento: async (motivo?: string): Promise<FichaModeloResponse> => {
    const res = await apiClient.post<FichaModeloResponse>('/modelos/entrenar', { motivo });
    return res.data;
  },
};
