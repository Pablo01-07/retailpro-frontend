import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { processesApi } from '@/api/processes';
import { useAuth } from '@/auth/useAuth';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { AlertBanner } from '@/components/common/AlertBanner';
import { ArrowLeft, Clock, RotateCcw, Loader2 } from 'lucide-react';
import { formatDateTimeLima, formatDurationSeconds, formatNumber, getEstadoProcesoBadge } from '@/lib/formatters';

const getGravedad = (
  estado: string,
  rechazados: number
): { label: string; variant: 'danger' | 'warning' | 'success' } => {
  const norm = (estado || '').toUpperCase().trim();
  if (norm === 'COMPLETADO') {
    return { label: 'Baja', variant: 'success' };
  }
  if (norm === 'CON_ADVERTENCIAS' || norm.includes('ADVERTENCIA')) {
    return { label: 'Media', variant: 'warning' };
  }
  if (norm === 'FALLIDO') {
    return rechazados > 50
      ? { label: 'Alta', variant: 'danger' }
      : { label: 'Media', variant: 'warning' };
  }
  return rechazados > 50
    ? { label: 'Alta', variant: 'danger' }
    : { label: 'Media', variant: 'warning' };
};

export const DetalleEjecucionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = user?.rol === 'administrador';
  const queryClient = useQueryClient();

  const [resultBanner, setResultBanner] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);
  const [warningBanner, setWarningBanner] = useState<string | null>(null);
  const [isBlocked409, setIsBlocked409] = useState(false);

  const { data: detalle, isLoading } = useQuery({
    queryKey: ['proceso-detalle', id],
    queryFn: () => processesApi.getDetalleEjecucion(id!),
    enabled: !!id,
  });

  const retryMutation = useMutation({
    mutationFn: () => processesApi.reintentarEjecucion(id!),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['proceso-detalle', id] });
      queryClient.invalidateQueries({ queryKey: ['procesos'] });
      const estadoResult = (res.estado || '').toUpperCase().trim();
      if (estadoResult === 'COMPLETADO' || estadoResult === 'CON_ADVERTENCIAS') {
        setResultBanner({
          type: 'success',
          message: res.mensaje || 'Reintento exitoso: la ejecución se completó correctamente.',
        });
      } else {
        setResultBanner({
          type: 'danger',
          message: res.mensaje || 'El reintento no resolvió el problema.',
        });
      }
      if (res.reintento_permitido === false) {
        setIsBlocked409(true);
      }
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail || 'No se pudo realizar el reintento.';
      if (status === 409) {
        setIsBlocked409(true);
        setWarningBanner(detail);
      } else {
        setResultBanner({
          type: 'danger',
          message: detail,
        });
      }
    },
  });

  if (isLoading) {
    return <div className="p-12 text-center text-sm text-gray-500">Cargando detalle de ejecución...</div>;
  }

  if (!detalle) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Ejecución no encontrada</h2>
        <Link to="/procesos">
          <Button variant="secondary" size="md" icon={<ArrowLeft size={16} />}>
            Volver a Monitoreo
          </Button>
        </Link>
      </div>
    );
  }

  const tipoNorm = (detalle.tipo_proceso || '').toLowerCase();
  const isCargaDatos =
    ['ventas', 'inventario', 'productos'].includes(tipoNorm) ||
    tipoNorm.includes('carga') ||
    tipoNorm.includes('etl');

  const isFallido = (detalle.estado || '').toUpperCase() === 'FALLIDO';
  const estadoBadge = getEstadoProcesoBadge(detalle.estado);
  const reintentosCount = detalle.reintentos ?? 0;
  const isRetryDisabled =
    retryMutation.isPending ||
    detalle.reintento_permitido === false ||
    reintentosCount >= 3 ||
    isBlocked409;

  const activeWarningDetail =
    warningBanner ||
    (isFallido && isCargaDatos && detalle.reintento_permitido === false
      ? reintentosCount >= 3
        ? 'Se alcanzó el límite de 3 reintentos para esta ejecución. Contacte al equipo técnico o espere la siguiente ejecución programada.'
        : 'El reintento no está permitido para esta ejecución.'
      : null);

  const getTipoTitulo = (tipo: string) => {
    if (tipo === 'ventas') return 'Actualización de ventas';
    if (tipo === 'inventario') return 'Procesamiento de inventario';
    if (tipo === 'pronostico') return 'Generación de pronósticos';
    if (tipo === 'entrenamiento') return 'Entrenamiento del modelo XGBoost';
    return `Ejecución de ${tipo}`;
  };

  const exitosos = Math.max(0, detalle.registros_procesados - detalle.registros_rechazados);

  const getEtapaStatusBadge = (estado: string) => {
    const norm = (estado || '').toLowerCase().trim();
    if (norm.includes('fall') || norm.includes('error')) {
      return {
        dotClass: 'bg-rose-500',
        badgeClass: 'bg-rose-100 text-rose-700 border border-rose-200 font-semibold',
      };
    }
    if (norm.includes('adv') || norm.includes('warn')) {
      return {
        dotClass: 'bg-amber-500',
        badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200 font-semibold',
      };
    }
    if (norm.includes('progreso') || norm.includes('pend')) {
      return {
        dotClass: 'bg-blue-500',
        badgeClass: 'bg-blue-100 text-blue-800 border border-blue-200 font-semibold',
      };
    }
    return {
      dotClass: 'bg-emerald-500',
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold',
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link to="/procesos" className="hover:text-brand-700 transition-colors">
          Monitoreo
        </Link>
        <span>&gt;</span>
        <span className="font-semibold text-gray-800">Detalle de ejecución</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Detalle de ejecución
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Historial, traza y resultado del proceso ejecutado.
        </p>
      </div>

      {resultBanner && (
        <AlertBanner
          type={resultBanner.type}
          message={resultBanner.message}
          onClose={() => setResultBanner(null)}
        />
      )}

      {activeWarningDetail && (
        <AlertBanner
          type="warning"
          message={activeWarningDetail}
        />
      )}

      {detalle.detalle_error && !resultBanner && (
        <AlertBanner type="danger" message={detalle.detalle_error} />
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {getTipoTitulo(detalle.tipo_proceso)}
            </h2>
            <p className="text-xs text-gray-500 tabular-nums mt-0.5">
              ID de ejecución: EJC-2026-{detalle.id_carga.toString().padStart(4, '0')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isFallido && isCargaDatos && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 font-semibold tabular-nums">
                  Reintentos: {reintentosCount}/3
                </span>
                {isAdmin && (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isRetryDisabled}
                    onClick={() => retryMutation.mutate()}
                    icon={
                      retryMutation.isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RotateCcw size={14} />
                      )
                    }
                  >
                    {retryMutation.isPending ? 'Reintentando...' : 'Reintentar ejecución'}
                  </Button>
                )}
              </div>
            )}
            <Badge variant={estadoBadge.variant}>{estadoBadge.label}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div>
            <span className="block text-xs text-gray-500 font-medium mb-1">Inicio</span>
            <span className="text-sm font-bold text-gray-900 tabular-nums">
              {formatDateTimeLima(detalle.fecha_ejecucion)}
            </span>
          </div>

          <div>
            <span className="block text-xs text-gray-500 font-medium mb-1">Duración</span>
            <span className="text-sm font-bold text-gray-900 tabular-nums">
              {formatDurationSeconds(detalle.duracion_total_segundos)}
            </span>
          </div>

          <div>
            <span className="block text-xs text-gray-500 font-medium mb-1">Registros procesados</span>
            <span className="text-sm font-bold text-gray-900 tabular-nums">
              {formatNumber(detalle.registros_procesados)}
            </span>
          </div>

          <div>
            <span className="block text-xs text-gray-500 font-medium mb-1">Registros exitosos</span>
            <span className="text-sm font-bold text-emerald-600 tabular-nums">
              {formatNumber(exitosos)}
            </span>
          </div>

          <div>
            <span className="block text-xs text-gray-500 font-medium mb-1">Con errores</span>
            <span className="text-sm font-bold text-red-600 tabular-nums">
              {formatNumber(detalle.registros_rechazados)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Registro específico de errores</h3>
        </div>

        {detalle.registros_rechazados === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            No se observaron errores en los registros de esta ejecución.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6 w-36">Código</th>
                  <th className="py-3 px-6">Descripción del error</th>
                  <th className="py-3 px-6 w-44">Registros afectados</th>
                  <th className="py-3 px-6 w-32 text-right">Gravedad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50/50">
                  <td className="py-3.5 px-6 text-xs font-semibold text-gray-700 tabular-nums">
                    ERR-{detalle.id_carga.toString().padStart(4, '0')}
                  </td>
                  <td className="py-3.5 px-6 text-gray-800 leading-relaxed">
                    {detalle.detalle_error || 'Registros no superaron la validación sintáctica requerida'}
                  </td>
                  <td className="py-3.5 px-6 text-gray-600 tabular-nums">
                    {detalle.registros_rechazados} registros
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    {(() => {
                      const g = getGravedad(detalle.estado, detalle.registros_rechazados);
                      return <Badge variant={g.variant}>{g.label}</Badge>;
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-5">
          Línea de tiempo de intentos y etapas
        </h3>

        {!detalle.etapas || detalle.etapas.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            No hay etapas registradas para esta ejecución.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
            {detalle.etapas.map((e, idx) => {
              const duracionTxt =
                e.duracion_ms !== undefined && e.duracion_ms !== null
                  ? e.duracion_ms < 1000
                    ? '< 1 s'
                    : `${(e.duracion_ms / 1000).toFixed(1)}s`
                  : null;

              const statusStyle = getEtapaStatusBadge(e.estado);

              return (
                <div key={idx} className="relative flex items-start gap-3">
                  <span
                    className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full ${statusStyle.dotClass} border-2 border-white shadow-sm`}
                  ></span>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{e.etapa}</h4>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock size={13} />
                        {formatDateTimeLima(e.timestamp)}
                      </span>
                      {duracionTxt && (
                        <span>
                          • Duración: {duracionTxt} ({e.duracion_ms} ms)
                        </span>
                      )}
                      <span
                        className={`capitalize text-[11px] px-2.5 py-0.5 rounded-full ${statusStyle.badgeClass}`}
                      >
                        {e.estado}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Link to="/procesos">
          <Button variant="secondary" size="md" icon={<ArrowLeft size={16} />}>
            Volver a procesos
          </Button>
        </Link>
      </div>
    </div>
  );
};
