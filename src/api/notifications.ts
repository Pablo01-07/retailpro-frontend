import { apiClient } from './client';

export interface ResumenAlertasRequest {
  destinatario?: string;
}

export interface ResumenAlertasResponse {
  success: boolean;
  enviado: boolean;
  cantidad_alertas: number;
  destinatarios: string[];
  message: string;
}

export interface NotificacionCargaItem {
  id_carga: number;
  tipo_carga: string;
  tipo_carga_etiqueta: string;
  fecha_ejecucion: string;
  registros_procesados: number;
  porcentaje_calidad: number;
  umbral_calidad: number;
  tipo_notificacion: 'exito' | 'advertencia_calidad' | string;
  mensaje: string;
}

export const notificationsApi = {
  enviarResumenAlertas: async (destinatario?: string): Promise<ResumenAlertasResponse> => {
    const payload: ResumenAlertasRequest = destinatario ? { destinatario } : {};
    const res = await apiClient.post<ResumenAlertasResponse>('/notificaciones/resumen-alertas', payload);
    return res.data;
  },

  getNotificacionesCargas: async (limite: number = 10): Promise<NotificacionCargaItem[]> => {
    const res = await apiClient.get<NotificacionCargaItem[]>('/notificaciones/cargas', {
      params: { limite },
    });
    return res.data;
  },

  getNotificacionesModelos: async (limite: number = 10): Promise<NotificacionCargaItem[]> => {
    const res = await apiClient.get<NotificacionCargaItem[]>('/notificaciones/modelos', {
      params: { limite },
    });
    return res.data;
  },
};
