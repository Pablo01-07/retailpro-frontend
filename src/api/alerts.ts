import { apiClient } from './client';

export interface AlertaItem {
  id_alerta: number;
  id_producto: number;
  sku: string;
  nombre_producto: string;
  categoria: string;
  tipo_alerta: 'QUIEBRE' | 'SOBRESTOCK';
  nivel_severidad: 'CRITICA' | 'ADVERTENCIA';
  prioridad?: 'ALTA' | 'MEDIA' | 'BAJA' | string;
  fecha_generacion: string;
  estado: string;
  fecha_revision?: string | null;
  stock_actual: number;
  punto_reorden: number;
  dias_cobertura: number;
  probabilidad_quiebre: number;
  detalle_motivo: string;
}

export interface AlertasResumen {
  activas?: number;
  criticas?: number;
  advertencias?: number;
  quiebre?: number;
  sobrestock?: number;
  resueltas?: number;
  descartadas?: number;
  total_activas: number;
  total_criticas?: number;
  total_advertencias?: number;
  total_quiebre: number;
  total_sobrestock: number;
  total_resueltas: number;
  total_descartadas?: number;
  items: AlertaItem[];
}

export interface ActualizarEstadoAlertaRequest {
  nuevo_estado: 'Activa' | 'Resuelta' | 'Descartada';
  comentario?: string;
}

export interface ActualizarEstadoAlertaResponse {
  id_alerta: number;
  nuevo_estado: string;
  fecha_revision?: string | null;
  mensaje: string;
}

export interface AlertasFilterParams {
  tipo?: string;
  estado?: string;
  categoria?: string;
}

export const alertsApi = {
  getAlertas: async (params?: AlertasFilterParams): Promise<AlertasResumen> => {
    const res = await apiClient.get<AlertasResumen>('/alertas', { params });
    return res.data;
  },

  actualizarEstado: async (
    idAlerta: number,
    payload: ActualizarEstadoAlertaRequest
  ): Promise<ActualizarEstadoAlertaResponse> => {
    const res = await apiClient.patch<ActualizarEstadoAlertaResponse>(`/alertas/${idAlerta}`, payload);
    return res.data;
  },
};
