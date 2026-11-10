import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/useAuth';
import { processesApi, ProcesoItem } from '@/api/processes';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { AlertBanner } from '@/components/common/AlertBanner';
import { Play, Eye, RefreshCw } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { formatDateTimeLima, getEstadoProcesoBadge } from '@/lib/formatters';

export const MonitoreoProcesosPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.rol === 'administrador';
  const canExecuteForecast = user?.rol === 'administrador' || user?.rol === 'analista';
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { data: procesos, isLoading } = useQuery({
    queryKey: ['procesos-batch'],
    queryFn: () => processesApi.listProcesos(),
    refetchInterval: 10000,
  });

  const ejecutarMutation = useMutation({
    mutationFn: (tipo: string) => processesApi.ejecutarProceso(tipo),
    onSuccess: (_data, variables) => {
      setActionSuccess(`Proceso "${variables}" ejecutado exitosamente.`);
      queryClient.invalidateQueries({ queryKey: ['procesos-batch'] });
    },
  });

  const items = procesos || [];
  const completadosHoy = items.filter((p) => p.estado_ultima_ejecucion.toUpperCase() === 'COMPLETADO').length;
  const pendientes = items.filter((p) => ['PENDIENTE', 'EN PROGRESO', 'EN COLA'].includes(p.estado_ultima_ejecucion.toUpperCase())).length;
  const fallidos = items.filter((p) => ['FALLIDO', 'ERROR'].includes(p.estado_ultima_ejecucion.toUpperCase())).length;

  const filteredItems = items.filter((p) => {
    if (filtroEstado === 'todos') return true;
    return p.estado_ultima_ejecucion.toLowerCase() === filtroEstado.toLowerCase();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6 border-b border-gray-200 text-sm font-medium">
        <NavLink
          to="/procesos"
          end
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Monitoreo de Procesos
        </NavLink>
        {isAdmin && (
          <NavLink
            to="/procesos/configuracion"
            className={({ isActive }) =>
              `pb-3 border-b-2 font-semibold transition-colors ${
                isActive
                  ? 'border-brand-700 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`
            }
          >
            Configuración de Procesos
          </NavLink>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Monitoreo de procesos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Supervise las ejecuciones de entrenamiento del modelo y procesamiento de lotes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link to="/procesos/configuracion">
              <Button variant="secondary" size="md">
                Configuración de horarios
              </Button>
            </Link>
          )}

          {canExecuteForecast ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => ejecutarMutation.mutate('pronostico')}
              isLoading={ejecutarMutation.isPending}
              icon={<Play size={15} />}
            >
              Ejecutar pronóstico diario
            </Button>
          ) : (
            <div title="La ejecución de procesos de pronóstico está reservada para Administrador y Analista">
              <Button
                variant="primary"
                size="md"
                disabled
                className="opacity-50 cursor-not-allowed"
                icon={<Play size={15} />}
              >
                Ejecutar pronóstico diario
              </Button>
            </div>
          )}
        </div>
      </div>

      {actionSuccess && (
        <AlertBanner type="success" message={actionSuccess} onClose={() => setActionSuccess(null)} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <span className="block text-xs text-gray-500 font-medium mb-1">
            Procesos completados (hoy)
          </span>
          <span className="text-3xl font-extrabold text-emerald-600">
            {completadosHoy}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <span className="block text-xs text-gray-500 font-medium mb-1">
            En cola / Pendientes
          </span>
          <span className="text-3xl font-extrabold text-amber-500">
            {pendientes}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <span className="block text-xs text-gray-500 font-medium mb-1">
            Fallidos (últimas 24h)
          </span>
          <span className="text-3xl font-extrabold text-red-600">
            {fallidos}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
        <div className="w-60">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Filtrar por Estado
          </label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-700/40"
          >
            <option value="todos">Todos</option>
            <option value="completado">Completado</option>
            <option value="en progreso">En progreso</option>
            <option value="pendiente">Pendiente</option>
            <option value="fallido">Fallido</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Ejecuciones de procesos recientes
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Mostrando {filteredItems.length} de {items.length} procesos registrados
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['procesos-batch'] })}
            icon={<RefreshCw size={14} />}
          >
            Actualizar
          </Button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Cargando procesos...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Proceso</th>
                  <th className="py-3 px-6">Fecha/Hora inicio</th>
                  <th className="py-3 px-6">Estado</th>
                  <th className="py-3 px-6">Frecuencia / Horario</th>
                  <th className="py-3 px-6">Registros / Info</th>
                  <th className="py-3 px-6 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((p: ProcesoItem) => (
                  <tr key={p.id_proceso} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-gray-900">{p.nombre}</div>
                      <div className="text-xs text-gray-500">{p.tipo}</div>
                    </td>
                    <td className="py-4 px-6 text-gray-700">
                      {p.ultima_ejecucion ? formatDateTimeLima(p.ultima_ejecucion) : '--'}
                    </td>
                    <td className="py-4 px-6">
                      {!p.ultima_ejecucion ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          Sin ejecuciones
                        </span>
                      ) : (
                        (() => {
                          const badge = getEstadoProcesoBadge(p.estado_ultima_ejecucion);
                          return <Badge variant={badge.variant}>{badge.label}</Badge>;
                        })()
                      )}
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {p.frecuencia} • {p.horario}
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {!p.ultima_ejecucion ? (
                        <span className="text-gray-400 italic text-xs">Sin ejecuciones</span>
                      ) : p.registros_afectados > 0 ? (
                        `${p.registros_afectados.toLocaleString()} registros`
                      ) : (
                        'Completado exitoso'
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {p.id_ultima_carga ? (
                        <Link
                          to={`/procesos/${p.id_ultima_carga}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors"
                        >
                          <Eye size={14} />
                          Ver detalle
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">Sin ejecuciones</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
