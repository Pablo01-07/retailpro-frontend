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

export const notificationsApi = {
  enviarResumenAlertas: async (destinatario?: string): Promise<ResumenAlertasResponse> => {
    const payload: ResumenAlertasRequest = destinatario ? { destinatario } : {};
    const res = await apiClient.post<ResumenAlertasResponse>('/notificaciones/resumen-alertas', payload);
    return res.data;
  },
};
