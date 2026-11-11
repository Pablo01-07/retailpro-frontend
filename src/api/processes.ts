import { apiClient } from './client';

export interface ProcesoItem {
  id_proceso: string;
  nombre: string;
  tipo: string;
  frecuencia: string;
  horario: string;
  ultima_ejecucion?: string | null;
  proxima_ejecucion?: string | null;
  estado_ultima_ejecucion: string;
  id_ultima_carga?: number | null;
  registros_afectados: number;
  info?: string | null;
  detalle_error?: string | null;
}

export interface EtapaProcesoItem {
  etapa: string;
  estado: string;
  timestamp: string;
  duracion_ms?: number;
}

export interface DetalleEjecucionResponse {
  id_carga: number;
  tipo_proceso: string;
  fecha_ejecucion: string;
  estado: string;
  registros_procesados: number;
  registros_rechazados: number;
  porcentaje_calidad: number;
  duracion_total_segundos?: number | null;
  etapas: EtapaProcesoItem[];
  detalle_error?: string | null;
  reintentos?: number;
  reintentos_max?: number;
  reintento_permitido?: boolean;
}

export interface ReintentoEjecucionResponse {
  id_carga: number;
  estado: string;
  reintentos: number;
  reintentos_max: number;
  reintento_permitido: boolean;
  mensaje: string;
}

export interface ProcesoConfigPatchRequest {
  activo?: boolean;
  frecuencia?: string;
  hora?: string;
  dia_semana?: number;
  reentrenamiento_umbral_registros?: number;
}

export interface ProcesoConfigItemResponse {
  id_proceso: string;
  nombre: string;
  tipo: string;
  activo: boolean;
  frecuencia: string;
  hora: string;
  dia_semana?: number | null;
  dia?: string | null;
  proxima_ejecucion?: string | null;
  reentrenamiento_umbral_registros?: number | null;
}

export interface ProcesoConfigSchema {
  etl_activo?: boolean;
  etl_frecuencia: string;
  etl_hora: string;
  etl_dia?: string;
  etl_dia_semana?: number;
  etl_proxima_ejecucion?: string | null;

  pronostico_activo?: boolean;
  pronostico_frecuencia: string;
  pronostico_hora: string;
  pronostico_dia?: string;
  pronostico_dia_semana?: number;
  pronostico_proxima_ejecucion?: string | null;

  reentrenamiento_activo?: boolean;
  reentrenamiento_frecuencia: string;
  reentrenamiento_dia: string;
  reentrenamiento_dia_semana?: number;
  reentrenamiento_hora: string;
  reentrenamiento_proxima_ejecucion?: string | null;
  reentrenamiento_umbral_registros?: number | null;

  alertas_notificacion_email: string;
  correo_alertas?: string;
  notificar_quiebre: boolean;
  quiebre_critico?: boolean;
  notificar_sobrestock: boolean;
  sobrestock_prolongado?: boolean;
  notificar_calidad_baja: boolean;
  calidad_bajo_umbral?: boolean;
  umbral_calidad?: number;
  calidad_min?: number;
  smtp_configurado?: boolean;

  procesos?: ProcesoConfigItemResponse[];
}

export const processesApi = {
  listProcesos: async (): Promise<ProcesoItem[]> => {
    const res = await apiClient.get<ProcesoItem[]>('/procesos');
    return res.data;
  },

  getDetalleEjecucion: async (idCarga: number | string): Promise<DetalleEjecucionResponse> => {
    const res = await apiClient.get<DetalleEjecucionResponse>(`/procesos/${idCarga}`);
    return res.data;
  },

  reintentarEjecucion: async (idCarga: number | string): Promise<ReintentoEjecucionResponse> => {
    const res = await apiClient.post<ReintentoEjecucionResponse>(`/procesos/${encodeURIComponent(idCarga)}/reintentar`);
    return res.data;
  },

  getConfiguracion: async (): Promise<ProcesoConfigSchema> => {
    const res = await apiClient.get<ProcesoConfigSchema>('/procesos/configuracion');
    return res.data;
  },

  getConfiguracionProceso: async (procesoId: string): Promise<ProcesoConfigItemResponse> => {
    const res = await apiClient.get<ProcesoConfigItemResponse>(
      `/procesos/configuracion/${encodeURIComponent(procesoId)}`
    );
    return res.data;
  },

  patchConfiguracionProceso: async (
    procesoId: string,
    patch: ProcesoConfigPatchRequest
  ): Promise<ProcesoConfigItemResponse> => {
    const res = await apiClient.patch<ProcesoConfigItemResponse>(
      `/procesos/configuracion/${encodeURIComponent(procesoId)}`,
      patch
    );
    return res.data;
  },

  updateConfiguracion: async (config: ProcesoConfigSchema): Promise<ProcesoConfigSchema> => {
    const res = await apiClient.put<ProcesoConfigSchema>('/procesos/configuracion', config);
    return res.data;
  },

  ejecutarProceso: async (
    tipoProceso: string
  ): Promise<{ mensaje?: string; id_carga?: number; estado?: string; error?: string }> => {
    const res = await apiClient.post<{ mensaje?: string; id_carga?: number; estado?: string; error?: string }>(
      `/procesos/ejecutar/${encodeURIComponent(tipoProceso)}`
    );
    return res.data;
  },
};
