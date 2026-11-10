import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataApi, CargaDatosItem } from '@/api/data';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { AlertBanner } from '@/components/common/AlertBanner';
import { RefreshCw, Clock, Filter, Eye } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { formatDateTimeLima, formatNumber } from '@/lib/formatters';

export const EstadoDatosPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const { data: estado, isLoading: loadingEstado } = useQuery({
    queryKey: ['estado-datos'],
    queryFn: () => dataApi.getEstadoDatos(),
    refetchInterval: 15000,
  });

  const { data: cargas, isLoading: loadingCargas } = useQuery({
    queryKey: ['cargas-recientes'],
    queryFn: () => dataApi.getCargas({ page: 1, size: 10 }),
    refetchInterval: 15000,
  });

  const syncMutation = useMutation({
    mutationFn: () => dataApi.sincronizarDatos(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estado-datos'] });
      queryClient.invalidateQueries({ queryKey: ['cargas-recientes'] });
    },
  });

  const getTipoDisplay = (item: CargaDatosItem) => {
    return (
      item.tipo_carga_etiqueta ||
      item.tipo_informacion_etiqueta ||
      (item.tipo_carga === 'ventas'
        ? 'Transacciones de Ventas'
        : item.tipo_carga === 'inventario'
        ? 'Nivel de Stock'
        : item.tipo_carga === 'productos'
        ? 'Catálogo Maestro de Productos'
        : item.tipo_carga)
    );
  };

  const filteredCargas = (cargas || []).filter((c) => {
    if (tipoFiltro === 'todos') return true;
    return c.tipo_carga.toLowerCase() === tipoFiltro.toLowerCase();
  });

  const isVentasDesact = estado?.ventas?.desactualizado === true || estado?.ventas?.estado?.toLowerCase() === 'desactualizado';
  const isInvDesact = estado?.inventario?.desactualizado === true || estado?.inventario?.estado?.toLowerCase() === 'desactualizado';
  const isProdDesact = estado?.catalogo?.desactualizado === true || estado?.catalogo?.estado?.toLowerCase() === 'desactualizado';
  const isCatDesact = estado?.categorias?.desactualizado === true || estado?.categorias?.estado?.toLowerCase() === 'desactualizado';

  const dimensionesDesactualizadas: string[] = [];
  if (isVentasDesact) dimensionesDesactualizadas.push('Ventas');
  if (isInvDesact) dimensionesDesactualizadas.push('Inventario');
  if (isProdDesact) dimensionesDesactualizadas.push('Productos');
  if (isCatDesact) dimensionesDesactualizadas.push('Categorías');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6 border-b border-gray-200 text-sm font-medium">
        <NavLink
          to="/datos"
          end
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Estado de Datos
        </NavLink>
        <NavLink
          to="/datos/carga"
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Carga de Archivos
        </NavLink>
        <NavLink
          to="/datos/calidad"
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Calidad de Datos
        </NavLink>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Estado y actualización de datos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Consulte la última sincronización de las bases de datos de inventario y ventas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/datos/carga">
            <Button variant="secondary" size="md">
              Cargar archivo
            </Button>
          </Link>
          <Button
            variant="primary"
            size="md"
            onClick={() => syncMutation.mutate()}
            isLoading={syncMutation.isPending}
            icon={<RefreshCw size={16} className={syncMutation.isPending ? 'animate-spin' : ''} />}
          >
            Sincronizar ahora
          </Button>
        </div>
      </div>

      {dimensionesDesactualizadas.length > 0 && (
        <AlertBanner
          type="warning"
          message={`Datos desactualizados: la información de ${dimensionesDesactualizadas.join(', ')} no se actualiza hace más de 24 horas.`}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`bg-white rounded-xl border p-5 shadow-sm ${isVentasDesact ? 'border-amber-400 bg-amber-50/20' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-900">Datos de Ventas</span>
            <Badge variant={isVentasDesact ? 'warning' : 'success'}>
              {isVentasDesact ? 'Desactualizado' : (estado?.ventas?.estado || 'Actualizado')}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock size={15} className={`shrink-0 ${isVentasDesact ? 'text-amber-500' : 'text-gray-400'}`} />
            <span>Última actualización: {formatDateTimeLima(estado?.ventas?.ultima_actualizacion)}</span>
          </div>
        </div>

        <div className={`bg-white rounded-xl border p-5 shadow-sm ${isInvDesact ? 'border-amber-400 bg-amber-50/20' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-900 truncate">Datos de Inventario</span>
            <Badge variant={isInvDesact ? 'warning' : 'success'}>
              {isInvDesact ? 'Desactualizado' : (estado?.inventario?.estado || 'Actualizado')}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock size={15} className={`shrink-0 ${isInvDesact ? 'text-amber-500' : 'text-gray-400'}`} />
            <span>Última actualización: {formatDateTimeLima(estado?.inventario?.ultima_actualizacion)}</span>
          </div>
        </div>

        <div className={`bg-white rounded-xl border p-5 shadow-sm ${isProdDesact ? 'border-amber-400 bg-amber-50/20' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-900 truncate">Datos de Productos</span>
            <Badge variant={isProdDesact ? 'warning' : 'success'}>
              {isProdDesact ? 'Desactualizado' : (estado?.catalogo?.estado || 'Actualizado')}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock size={15} className={`shrink-0 ${isProdDesact ? 'text-amber-500' : 'text-gray-400'}`} />
            <span>Última actualización: {formatDateTimeLima(estado?.catalogo?.ultima_actualizacion)}</span>
          </div>
        </div>

        <div className={`bg-white rounded-xl border p-5 shadow-sm ${isCatDesact ? 'border-amber-400 bg-amber-50/20' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-900 truncate">Datos de Categorías</span>
            <Badge variant={isCatDesact ? 'warning' : 'success'}>
              {isCatDesact ? 'Desactualizado' : (estado?.categorias?.estado || 'Actualizado')}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock size={15} className={`shrink-0 ${isCatDesact ? 'text-amber-500' : 'text-gray-400'}`} />
            <span>
              {isCatDesact && estado?.categorias?.ultima_actualizacion
                ? `Última actualización: ${formatDateTimeLima(estado.categorias.ultima_actualizacion)}`
                : `${estado?.categorias?.total_categorias ?? '--'} categorías activas`}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Historial de actualizaciones recientes</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Mostrando {filteredCargas.length} de {cargas?.length ?? filteredCargas.length} cargas registradas
            </p>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 py-1.5 px-3 rounded-lg hover:bg-brand-50 transition-colors"
            >
              <span>Filtrar por origen</span>
              <Filter size={14} />
            </button>

            {showFilterMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 text-xs">
                {['todos', 'ventas', 'inventario', 'productos'].map((orig) => (
                  <button
                    key={orig}
                    onClick={() => {
                      setTipoFiltro(orig);
                      setShowFilterMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 capitalize ${
                      tipoFiltro === orig ? 'font-bold text-brand-700 bg-emerald-50/50' : 'text-gray-700'
                    }`}
                  >
                    {orig === 'todos' ? 'Todos los orígenes' : orig}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {loadingCargas || loadingEstado ? (
          <div className="p-8 text-center text-sm text-gray-500">Cargando historial de datos...</div>
        ) : filteredCargas.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No se registran cargas en el historial.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Fecha de carga</th>
                  <th className="py-3 px-6">Tipo de información</th>
                  <th className="py-3 px-6">Estado de carga</th>
                  <th className="py-3 px-6">Registros afectados</th>
                  <th className="py-3 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCargas.map((item: CargaDatosItem) => (
                  <tr key={item.id_carga} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 text-gray-900 font-medium">
                      {formatDateTimeLima(item.fecha_ejecucion)}
                    </td>
                    <td className="py-4 px-6 text-gray-700">
                      {getTipoDisplay(item)}
                    </td>
                    <td className="py-4 px-6">
                      <Badge status={item.estado_display || item.estado}>
                        {item.estado_display || item.estado}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {formatNumber(item.registros_procesados)} registros
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        to={`/datos/cargas/${item.id_carga}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors"
                      >
                        <Eye size={14} />
                        Consultar detalles
                      </Link>
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
