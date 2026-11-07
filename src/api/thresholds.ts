import { apiClient } from './client';

export interface UmbralItem {
  tipo_umbral: string;
  nombre_display: string;
  valor: number;
  unidad: string;
  descripcion: string;
  fecha_actualizacion?: string | null;
}

export interface UmbralesResponse {
  umbrales: UmbralItem[];
}

export interface ActualizarUmbralesRequest {
  quiebre_prob_min?: number;
  quiebre_dias_cobertura?: number;
  sobrestock_pct?: number;
  sobrestock_dias?: number;
  calidad_min?: number;
  mape_max?: number;
  nivel_servicio_ref?: number;
}

export const thresholdsApi = {
  getUmbrales: async (): Promise<UmbralesResponse> => {
    const res = await apiClient.get<UmbralesResponse>('/umbrales');
    return res.data;
  },

  actualizarUmbrales: async (payload: ActualizarUmbralesRequest): Promise<UmbralesResponse> => {
    const res = await apiClient.put<UmbralesResponse>('/umbrales', payload);
    return res.data;
  },
};
