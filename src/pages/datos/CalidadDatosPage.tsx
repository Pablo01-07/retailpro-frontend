import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dataApi } from '@/api/data';
import { Badge } from '@/components/common/Badge';
import { AlertBanner } from '@/components/common/AlertBanner';
import { Check, Calendar } from 'lucide-react';
import { formatDateLima, formatDateTimeLima, formatNumber, formatPct } from '@/lib/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';

export const CalidadDatosPage: React.FC = () => {
  const [tipoInfo, setTipoInfo] = useState<string>('ventas');
  const [rangoMeses, setRangoMeses] = useState<string>('6');

  const getFechaInicio = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - parseInt(rangoMeses, 10));
    return d.toISOString().split('T')[0];
  };

  const { data: calidad, isLoading } = useQuery({
    queryKey: ['datos-calidad', tipoInfo, rangoMeses],
    queryFn: () =>
      dataApi.getCalidad({
        tipo_informacion: tipoInfo === 'todos' ? undefined : tipoInfo,
        fecha_inicio: getFechaInicio(),
        fecha_fin: new Date().toISOString().split('T')[0],
      }),
    refetchInterval: 20000,
  });

  const calidadGeneral = calidad?.calidad_promedio_pct ?? 0;
  const umbralMinimo = calidad?.umbral_minimo_pct ?? 98.0;
  const registrosValidosPct = roundDec(calidadGeneral);
  const registrosRechazadosPct = roundDec(Math.max(0, 100.0 - calidadGeneral));
  const cumpleUmbral = calidadGeneral >= umbralMinimo;

  function roundDec(val: number) {
    return Math.round(val * 10) / 10;
  }

  const historicoData = (calidad?.historico_cargas || [])
    .slice(0, 6)
    .reverse()
    .map((h) => {
      let mesLabel = h.fecha;
      try {
        const d = new Date(h.fecha);
        mesLabel = d.toLocaleDateString('es-PE', { month: 'short' });
        mesLabel = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1).replace('.', '');
      } catch {
      }
      return {
        mes: mesLabel,
        calidad: roundDec(h.porcentaje_calidad),
        fecha: formatDateLima(h.fecha),
        archivo: h.nombre_archivo || `Carga #${h.id_carga}`,
      };
    });

  const chartData = historicoData;

  const incidenciasAPI = calidad?.incidencias_frecuentes || [];

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

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Reporte de calidad de datos
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitoreo de umbrales y consistencia histórica de la información de catálogo.
        </p>
      </div>

      {calidad?.ultima_carga_cumple === false && (
        <AlertBanner
          type="danger"
          message={`Calidad insuficiente: la última carga (${calidad.ultima_carga_pct ?? 0}%) está por debajo del umbral de aceptación (${calidad.umbral_minimo_pct ?? 98}%).`}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center gap-4">
          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-brand-700"
                strokeDasharray={`${calidadGeneral}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-bold text-gray-900">
              {Math.round(calidadGeneral)}%
            </span>
          </div>

          <div>
            <span className="block text-xs text-gray-500 font-medium">Calidad general</span>
            <span className="text-2xl font-extrabold text-gray-900">
              {formatPct(calidadGeneral, 1)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <span className="block text-xs text-gray-500 font-medium mb-1">Registros válidos</span>
          <span className="text-2xl font-extrabold text-brand-700">
            {formatPct(registrosValidosPct, 1)}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <span className="block text-xs text-gray-500 font-medium mb-1">Registros rechazados</span>
          <span className="text-2xl font-extrabold text-red-600">
            {formatPct(registrosRechazadosPct, 1)}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <span className="block text-xs text-gray-500 font-medium mb-1">Umbral de aceptación</span>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-extrabold text-gray-900">
              {formatPct(umbralMinimo, 1)}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                cumpleUmbral
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              <Check size={12} />
              {cumpleUmbral ? 'Cumple' : 'No cumple'}
            </span>
          </div>
        </div>

        <div
          className={`bg-white rounded-xl border p-5 shadow-sm flex flex-col justify-between ${
            calidad?.ultima_carga_cumple === false
              ? 'border-rose-400 bg-rose-50/30'
              : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="block text-xs font-medium text-gray-500">Última carga</span>
            {calidad?.ultima_carga_cumple !== undefined && calidad?.ultima_carga_cumple !== null && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  calidad.ultima_carga_cumple
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-100 text-rose-700 border border-rose-300'
                }`}
              >
                {calidad.ultima_carga_cumple ? 'Cumple' : 'No cumple'}
              </span>
            )}
          </div>
          <div>
            <span
              className={`text-2xl font-extrabold ${
                calidad?.ultima_carga_cumple === false ? 'text-red-600' : 'text-gray-900'
              }`}
            >
              {calidad?.ultima_carga_pct !== undefined && calidad?.ultima_carga_pct !== null
                ? `${calidad.ultima_carga_pct}%`
                : '--'}
            </span>
          </div>
          <div className="text-[11px] text-gray-500 mt-2 space-y-0.5">
            <div className="capitalize font-medium text-gray-700">
              Tipo: {calidad?.ultima_carga_tipo || '--'}
            </div>
            <div>
              {calidad?.ultima_carga_fecha
                ? formatDateTimeLima(calidad.ultima_carga_fecha)
                : '--'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="w-full sm:w-60">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Tipo de información
          </label>
          <select
            value={tipoInfo}
            onChange={(e) => setTipoInfo(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-700/40"
          >
            <option value="ventas">Transacciones de Ventas</option>
            <option value="inventario">Nivel de Stock</option>
            <option value="productos">Catálogo Maestro de Productos</option>
            <option value="todos">Todos los orígenes</option>
          </select>
        </div>

        <div className="w-full sm:w-64">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Rango de fechas
          </label>
          <div className="relative">
            <select
              value={rangoMeses}
              onChange={(e) => setRangoMeses(e.target.value)}
              className="w-full px-3 py-2 pr-9 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-700/40 appearance-none"
            >
              <option value="3">Últimos 3 meses</option>
              <option value="6">Últimos 6 meses</option>
              <option value="12">Últimos 12 meses</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
              <Calendar size={16} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Evolución histórica de calidad (% - últimos {rangoMeses} meses)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Porcentaje mensual de registros procesados conformes
            </p>
          </div>
          <span className="text-xs font-medium text-gray-500">
            Umbral mínimo de aceptación: <strong className="text-gray-800">{formatPct(umbralMinimo, 1)}</strong>
          </span>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-sm text-gray-500">
            Cargando evolución histórica...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-gray-500">
            No se registran cargas en el período seleccionado.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis
                  dataKey="mes"
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <YAxis
                  domain={[80, 100]}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  unit="%"
                />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Calidad']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    borderColor: '#e5e7eb',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="calidad" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  <LabelList
                    dataKey="calidad"
                    position="top"
                    formatter={(val: number) => `${val}%`}
                    style={{ fill: '#15803d', fontSize: '11px', fontWeight: 600 }}
                  />

                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.calidad >= umbralMinimo ? '#15803d' : '#d97706'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Incidencias frecuentes reportadas</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Mostrando {incidenciasAPI.length} de {incidenciasAPI.length} tipos de incidencias identificados
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/75 border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-6">Tipo de incidencia</th>
                <th className="py-3 px-6">Cantidad de registros</th>
                <th className="py-3 px-6">Porcentaje</th>
                <th className="py-3 px-6 text-right">Tendencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {incidenciasAPI.map((inc: any, index: number) => {
                const pct = inc.porcentaje ?? 0;
                const tendencia =
                  pct > 50
                    ? 'Subiendo'
                    : pct > 3
                    ? 'Estable'
                    : 'Bajando';
                return (
                  <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 text-gray-900 font-medium">{inc.etiqueta}</td>
                    <td className="py-4 px-6 text-gray-700">{formatNumber(inc.cantidad)}</td>
                    <td className="py-4 px-6 text-gray-600">{formatPct(pct, 2)}</td>
                    <td className="py-4 px-6 text-right">
                      <Badge
                        variant={
                          tendencia === 'Bajando'
                            ? 'success'
                            : tendencia === 'Estable'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {tendencia}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
