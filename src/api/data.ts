import { apiClient } from './client';

export interface EstadoItem {
  ultima_actualizacion: string | null;
  desactualizado?: boolean;
  total_registros: number;
  estado: string;
  detalle?: string | null;
}

export interface CategoriasItem {
  ultima_actualizacion?: string | null;
  desactualizado?: boolean;
  total_categorias: number;
  categorias: string[];
  estado: string;
  detalle?: string | null;
}

export interface EstadoDatosResponse {
  ventas: EstadoItem;
  inventario: EstadoItem;
  catalogo: EstadoItem;
  categorias: CategoriasItem;
}

export interface CargaDatosItem {
  id_carga: number;
  id_usuario?: number | null;
  tipo_carga: string;
  fecha_ejecucion: string;
  estado: string;
  estado_display?: string | null;
  registros_procesados: number;
  registros_rechazados: number;
  porcentaje_calidad: number;
  detalle_error?: string | null;
  nombre_archivo?: string | null;
  tipo_carga_etiqueta?: string | null;
  tipo_informacion_etiqueta?: string | null;
}

export interface UploadResultResponse {
  id_carga: number;
  tipo_carga: string;
  estado: string;
  estado_display: string;
  registros_procesados: number;
  registros_validos: number;
  registros_rechazados: number;
  porcentaje_calidad: number;
  umbral_calidad: number;
  apto_para_procesar: boolean;
  resumen_errores: Record<string, number>;
  mensaje: string;
}

export interface IncidenciaItem {
  fila: number;
  columna: string;
  tipo_error: string;
  motivo: string;
  valor?: string | null;
}

export interface CargaDetalleResponse {
  carga: CargaDatosItem;
  resumen: {
    nombre_archivo?: string;
    registros_procesados?: number;
    registros_validos?: number;
    registros_rechazados?: number;
    porcentaje_calidad?: number;
    desglose_errores?: Record<string, number>;
    [key: string]: unknown;
  };
  etapas: Array<{
    etapa: string;
    estado: string;
    timestamp: string;
    duracion_ms?: number;
  }>;
  muestra_incidencias: IncidenciaItem[];
}

export interface CalidadHistoricoItem {
  id_carga: number;
  tipo_carga: string;
  fecha: string;
  porcentaje_calidad: number;
  estado: string;
  registros_procesados: number;
  registros_rechazados: number;
  [key: string]: unknown;
}

export interface IncidenciaFrecuenteItem {
  codigo: string;
  etiqueta: string;
  cantidad: number;
  porcentaje?: number | null;
}

export interface CalidadGlobalResponse {
  calidad_promedio_pct: number;
  umbral_minimo_pct: number;
  total_cargas: number;
  cargas_conformes: number;
  cargas_no_conformes: number;
  total_registros_procesados: number;
  total_registros_rechazados: number;
  desglose_errores: Record<string, number>;
  desglose_errores_etiquetas?: Record<string, number> | null;
  historico_cargas: CalidadHistoricoItem[];
  incidencias_frecuentes?: IncidenciaFrecuenteItem[] | null;
  ultima_carga_pct?: number | null;
  ultima_carga_fecha?: string | null;
  ultima_carga_tipo?: string | null;
  ultima_carga_cumple?: boolean | null;
}

export const dataApi = {
  getEstadoDatos: async (): Promise<EstadoDatosResponse> => {
    const res = await apiClient.get<EstadoDatosResponse>('/datos/estado');
    return res.data;
  },

  sincronizarDatos: async (): Promise<{ mensaje: string; resultados?: unknown }> => {
    const res = await apiClient.post<{ mensaje: string; resultados?: unknown }>('/datos/sincronizar');
    return res.data;
  },

  uploadFile: async (
    file: File,
    tipoCarga: 'ventas' | 'inventario' | 'productos',
    onProgress?: (percent: number) => void
  ): Promise<UploadResultResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo_carga', tipoCarga);

    const res = await apiClient.post<UploadResultResponse>('/datos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
    return res.data;
  },

  getCargas: async (params?: {
    tipo_carga?: string;
    estado?: string;
    page?: number;
    size?: number;
  }): Promise<CargaDatosItem[]> => {
    const res = await apiClient.get<CargaDatosItem[]>('/datos/cargas', { params });
    return res.data;
  },

  getCargaDetalle: async (idCarga: number | string): Promise<CargaDetalleResponse> => {
    const res = await apiClient.get<CargaDetalleResponse>(`/datos/cargas/${idCarga}`);
    return res.data;
  },

  getCargaIncidencias: async (
    idCarga: number | string,
    tipoError?: string
  ): Promise<IncidenciaItem[]> => {
    const res = await apiClient.get<IncidenciaItem[]>(`/datos/cargas/${idCarga}/incidencias`, {
      params: tipoError ? { tipo_error: tipoError } : undefined,
    });
    return res.data;
  },

  procesarValidos: async (
    idCarga: number | string
  ): Promise<{ mensaje: string; registros_insertados: number }> => {
    const res = await apiClient.post<{ mensaje: string; registros_insertados: number }>(
      `/datos/cargas/${idCarga}/procesar-validos`
    );
    return res.data;
  },

  getCalidad: async (params?: {
    tipo_informacion?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
  }): Promise<CalidadGlobalResponse> => {
    const res = await apiClient.get<CalidadGlobalResponse>('/datos/calidad', { params });
    return res.data;
  },
};
