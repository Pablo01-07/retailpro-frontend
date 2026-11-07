import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/useAuth';
import { alertsApi, AlertaItem, AlertasFilterParams } from '@/api/alerts';
import { formatDateTimeLima } from '@/lib/formatters';
import {
  AlertTriangle,
  ChevronDown,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react';

export const CentroAlertasPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [tipoFiltro, setTipoFiltro] = useState<string>('TODOS');
  const [prioridadFiltro, setPrioridadFiltro] = useState<string>('TODAS');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('Activa');

  const [selectedAlerta, setSelectedAlerta] = useState<AlertaItem | null>(null);
  const [comentarioRevision, setComentarioRevision] = useState<string>('Revisión operativa de inventario');
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const canManageAlerts = user?.rol === 'administrador' || user?.rol === 'analista';

  const queryParams: AlertasFilterParams = useMemo(() => {
    const p: AlertasFilterParams = {};
    if (tipoFiltro !== 'TODOS') p.tipo = tipoFiltro;
    if (estadoFiltro !== 'TODOS') p.estado = estadoFiltro;
    return p;
  }, [tipoFiltro, estadoFiltro]);

  const {
    data: alertsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['centro-alertas', queryParams],
    queryFn: () => alertsApi.getAlertas(queryParams),
    refetchInterval: 20000,
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      idAlerta,
      nuevoEstado,
      comentario,
    }: {
      idAlerta: number;
      nuevoEstado: 'Activa' | 'Resuelta' | 'Descartada';
      comentario?: string;
    }) => {
      return alertsApi.actualizarEstado(idAlerta, {
        nuevo_estado: nuevoEstado,
        comentario,
      });
    },
    onSuccess: async (res) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['centro-alertas'] }),
        queryClient.invalidateQueries({ queryKey: ['active-alerts-count'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-resumen'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] }),
      ]);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['centro-alertas'] }),
        queryClient.refetchQueries({ queryKey: ['active-alerts-count'] }),
        queryClient.refetchQueries({ queryKey: ['dashboard-resumen'] }),
      ]);
      setFeedbackBanner(res.mensaje);
      setSelectedAlerta(null);
      setTimeout(() => setFeedbackBanner(null), 5000);
    },
  });

  const backendCriticas = alertsData?.total_criticas ?? alertsData?.criticas ?? 0;
  const backendAdvertencias = alertsData?.total_advertencias ?? alertsData?.advertencias ?? 0;

  const filteredItems = useMemo(() => {
    if (!alertsData?.items) return [];
    if (prioridadFiltro === 'TODAS') return alertsData.items;

    return alertsData.items.filter((item) => {
      const prio = (item.prioridad || (item.nivel_severidad === 'CRITICA' ? 'ALTA' : 'MEDIA')).toUpperCase();
      return prio === prioridadFiltro;
    });
  }, [alertsData, prioridadFiltro]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6 border-b border-gray-200 text-sm font-medium">
        <NavLink
          to="/alertas"
          end
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Centro de Alertas
        </NavLink>
        <NavLink
          to="/alertas/umbrales"
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Configuración de Umbrales
        </NavLink>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Centro de alertas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitoreo de anomalías críticas de inventario y alertas automatizadas
        </p>
      </div>

      {feedbackBanner && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{feedbackBanner}</span>
          </div>
          <button
            onClick={() => setFeedbackBanner(null)}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        <div className="bg-white rounded-xl p-5 shadow-card border border-gray-100 flex flex-col justify-between">
          <span className="text-xs font-medium text-gray-500">Alertas activas</span>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {alertsData?.total_activas ?? 0}
          </div>
          <p className="text-xs text-gray-500 mt-3">Requieren atención en las próximas horas</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-card border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-gray-500">Quiebre de stock</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
              {backendCriticas} críticas · {backendAdvertencias} en advertencia
            </span>
          </div>
          <div className="text-3xl font-bold text-rose-600 mt-2">
            {alertsData?.total_quiebre ?? 0} SKU
          </div>
          <p className="text-xs text-gray-500 mt-3">Inventario por debajo del umbral mínimo</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-card border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-gray-500">Sobrestock</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              {alertsData?.total_sobrestock ?? 0} Alertas
            </span>
          </div>
          <div className="text-3xl font-bold text-amber-500 mt-2">
            {alertsData?.total_sobrestock ?? 0} SKU
          </div>
          <p className="text-xs text-gray-500 mt-3">Exceso de cobertura respecto a la demanda</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-card border border-gray-100">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de alerta</label>
            <div className="relative">
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3.5 py-2 pr-9 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm cursor-pointer"
              >
                <option value="TODOS">Quiebre y Sobrestock</option>
                <option value="QUIEBRE">Quiebre de stock</option>
                <option value="SOBRESTOCK">Sobrestock</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Prioridad</label>
            <div className="relative">
              <select
                value={prioridadFiltro}
                onChange={(e) => setPrioridadFiltro(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3.5 py-2 pr-9 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm cursor-pointer"
              >
                <option value="TODAS">Todas las prioridades</option>
                <option value="ALTA">Alta (Crítica)</option>
                <option value="MEDIA">Media (Advertencia)</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
            <div className="relative">
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3.5 py-2 pr-9 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm cursor-pointer"
              >
                <option value="Activa">Solo activas</option>
                <option value="TODOS">Todas las alertas</option>
                <option value="Resuelta">Resuelta</option>
                <option value="Descartada">Descartada</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Listado de alertas críticas de inventario
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Mostrando {filteredItems.length} de {alertsData?.total_activas ?? alertsData?.items?.length ?? filteredItems.length} alertas registradas
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3">
            <Loader2 className="animate-spin text-brand-700" size={36} />
            <p className="text-xs text-gray-500">Sincronizando alertas del catálogo...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm">
            Error al consultar el centro de alertas.
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center text-gray-400 text-sm">
            No existen alertas registradas para los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/60 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Producto</th>
                  <th className="py-3 px-5">SKU</th>
                  <th className="py-3 px-5 text-right">Stock actual</th>
                  <th className="py-3 px-5 text-center">Tipo de alerta</th>
                  <th className="py-3 px-5 text-center">Riesgo</th>
                  <th className="py-3 px-5 text-center">Fecha</th>
                  <th className="py-3 px-5 text-center">Prioridad</th>
                  <th className="py-3 px-5 text-center">Estado</th>
                  <th className="py-3 px-5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
                {filteredItems.map((item) => {
                  const isQuiebre = item.tipo_alerta === 'QUIEBRE';
                  const isCritica = item.nivel_severidad === 'CRITICA';

                  return (
                    <tr key={item.id_alerta} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-gray-900 max-w-[190px] truncate">
                        {item.nombre_producto}
                      </td>
                      <td className="py-3.5 px-5 text-gray-500">{item.sku}</td>
                      <td className="py-3.5 px-5 text-right font-bold tabular-nums text-gray-900">
                        {item.stock_actual} u
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        {isQuiebre ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                            Quiebre de stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Sobrestock
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span
                          className={`font-bold ${
                            isCritica ? 'text-rose-600' : 'text-amber-600'
                          }`}
                        >
                          {isCritica ? 'Alto' : 'Medio'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center text-gray-500">
                        {formatDateTimeLima(item.fecha_generacion)}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        {(item.prioridad === 'ALTA' || isCritica) ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                            Alta
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Media
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        {((item.estado || '').toUpperCase() === 'ACTIVA' || (item.estado || '').toUpperCase() === 'PENDIENTE') && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
                            Activa
                          </span>
                        )}
                        {(item.estado || '').toUpperCase() === 'RESUELTA' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Resuelta
                          </span>
                        )}
                        {(item.estado || '').toUpperCase() === 'DESCARTADA' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                            Descartada
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => setSelectedAlerta(item)}
                          className="text-brand-700 hover:text-brand-900 font-semibold transition-colors hover:underline"
                        >
                          Consultar detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedAlerta && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedAlerta.nombre_producto}</h3>
                <span className="text-xs text-gray-500">
                  {selectedAlerta.sku} • {selectedAlerta.categoria}
                </span>
              </div>
              <button
                onClick={() => setSelectedAlerta(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="text-gray-500">Stock actual</span>
                <div className="text-base font-bold text-gray-900 mt-1">
                  {selectedAlerta.stock_actual} u
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="text-gray-500">Punto de reorden</span>
                <div className="text-base font-bold text-gray-900 mt-1">
                  {selectedAlerta.punto_reorden} u
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="text-gray-500">Días de cobertura</span>
                <div className="text-base font-bold text-gray-900 mt-1">
                  {selectedAlerta.dias_cobertura} días
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="text-gray-500">Probabilidad quiebre</span>
                <div className="text-base font-bold text-gray-900 mt-1">
                  {selectedAlerta.probabilidad_quiebre}%
                </div>
              </div>
            </div>

            <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-100 text-xs">
              <div className="font-semibold text-rose-900 flex items-center gap-1.5 mb-1">
                <AlertTriangle size={14} className="text-rose-600" />
                <span>Diagnóstico del motor de monitoreo:</span>
              </div>
              <p className="text-rose-800 leading-relaxed">{selectedAlerta.detalle_motivo}</p>
            </div>

            {canManageAlerts ? (
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Comentario de resolución / descarte (Auditoría Ley N.° 29733):
                  </label>
                  <input
                    type="text"
                    value={comentarioRevision}
                    onChange={(e) => setComentarioRevision(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm"
                    placeholder="Justificación de la acción realizada"
                  />
                </div>

                {((selectedAlerta.estado || '').toUpperCase() === 'ACTIVA' || (selectedAlerta.estado || '').toUpperCase() === 'PENDIENTE') ? (
                  <div className="space-y-3 pt-2">
                    <div className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-100 space-y-1">
                      <p><strong className="text-gray-700">Resuelta:</strong> ya se tomó acción (se emitió la reposición).</p>
                      <p><strong className="text-gray-700">Descartada:</strong> falsa alarma o no requiere acción.</p>
                    </div>

                    <div className="flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setSelectedAlerta(null)}
                        className="px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Cerrar
                      </button>

                      <button
                        type="button"
                        disabled={statusMutation.isPending}
                        onClick={() =>
                          statusMutation.mutate({
                            idAlerta: selectedAlerta.id_alerta,
                            nuevoEstado: 'Descartada',
                            comentario: comentarioRevision,
                          })
                        }
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                      >
                        Descartar
                      </button>

                      <button
                        type="button"
                        disabled={statusMutation.isPending}
                        onClick={() =>
                          statusMutation.mutate({
                            idAlerta: selectedAlerta.id_alerta,
                            nuevoEstado: 'Resuelta',
                            comentario: comentarioRevision,
                          })
                        }
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {statusMutation.isPending && (
                          <Loader2 size={14} className="animate-spin" />
                        )}
                        <span>Resolver alerta</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedAlerta(null)}
                      className="px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cerrar
                    </button>

                    <button
                      type="button"
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({
                          idAlerta: selectedAlerta.id_alerta,
                          nuevoEstado: 'Activa',
                          comentario: 'Reactivación de alerta por revisión operativa',
                        })
                      }
                      className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {statusMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                      <span>Reactivar alerta</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-500 text-center py-2.5 bg-gray-50 rounded-lg border border-gray-100">
                Modo consulta ejecutiva para Jefe de Logística. La resolución y descarte de alertas está reservada para Administrador y Analista.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
