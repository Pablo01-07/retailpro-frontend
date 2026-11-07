import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, NivelServicioFilterParams } from '@/api/dashboard';
import { forecastsApi, PronosticoSkuResumen } from '@/api/forecasts';
import { formatPct } from '@/lib/formatters';
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Info,
  Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

export const NivelServicioPage: React.FC = () => {
  const [selectedSku, setSelectedSku] = useState<string>('Todos los productos');
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('Últimos 6 meses');
  const [selectedAlmacen, setSelectedAlmacen] = useState<string>('Principal');

  const queryParams: NivelServicioFilterParams = useMemo(() => {
    return {
      sku: selectedSku !== 'Todos los productos' ? selectedSku : undefined,
      periodo: selectedPeriodo,
      almacen: selectedAlmacen,
    };
  }, [selectedSku, selectedPeriodo, selectedAlmacen]);

  const {
    data: nsData,
    isLoading,
  } = useQuery({
    queryKey: ['dashboard-nivel-servicio', queryParams],
    queryFn: () => dashboardApi.getNivelServicio(queryParams),
    staleTime: 30000,
  });

  const { data: pronosticosList } = useQuery({
    queryKey: ['pronosticos-catalogo-ns'],
    queryFn: () => forecastsApi.listPronosticos(),
    staleTime: 5 * 60 * 1000,
  });

  const metaRef = nsData?.meta_referencial_pct ?? 95.0;
  const nsGlobal = nsData?.nivel_servicio_global_pct ?? 0;
  const difGlobal = nsGlobal - metaRef;
  const isGlobalPositive = difGlobal >= 0;

  const chartData = useMemo(() => {
    if (!nsData?.por_categoria) return [];
    return nsData.por_categoria.map((cat) => ({
      name: cat.categoria,
      proyectado: Number(cat.fill_rate_estimado_pct.toFixed(1)),
      referencia: metaRef,
      cumple: cat.cumple_meta,
    }));
  }, [nsData, metaRef]);

  const { peorCategoria, mejorCategoria } = useMemo(() => {
    if (!nsData?.por_categoria || nsData.por_categoria.length === 0) {
      return { peorCategoria: null, mejorCategoria: null };
    }
    const sorted = [...nsData.por_categoria].sort(
      (a, b) => a.fill_rate_estimado_pct - b.fill_rate_estimado_pct
    );
    return {
      peorCategoria: sorted[0],
      mejorCategoria: sorted[sorted.length - 1],
    };
  }, [nsData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6 border-b border-gray-200 text-sm font-medium">
        <NavLink
          to="/inventarios"
          end
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Recomendaciones de Reposición
        </NavLink>
        <NavLink
          to="/inventarios/nivel-servicio"
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Nivel de Servicio
        </NavLink>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Comparación del nivel de servicio
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Nivel de servicio (Fill Rate): porcentaje de demanda satisfecha inmediatamente desde stock sin incurrir en quiebres.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        <div className="bg-white rounded-xl p-5 shadow-card border border-gray-100 flex flex-col justify-between">
          <span className="text-xs font-medium text-gray-500">
            Nivel de servicio proyectado
          </span>
          <div
            className={`text-3xl font-bold mt-2 ${
              isGlobalPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatPct(nsGlobal, 1)}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Estimación para: {selectedPeriodo}
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-card border border-gray-100 flex flex-col justify-between">
          <span className="text-xs font-medium text-gray-500">
            Nivel de servicio referencia
          </span>
          <div className="text-3xl font-bold text-gray-700 mt-2">
            {formatPct(metaRef, 1)}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Umbral mínimo establecido como objetivo
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-card border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-gray-500">
              Variación proyectada
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                isGlobalPositive
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-rose-50 text-rose-600 border border-rose-200'
              }`}
            >
              {isGlobalPositive ? `+${difGlobal.toFixed(1)}%` : `${difGlobal.toFixed(1)}%`}
            </span>
          </div>
          <div
            className={`text-3xl font-bold mt-2 ${
              isGlobalPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {isGlobalPositive ? `+${difGlobal.toFixed(1)}%` : `${difGlobal.toFixed(1)}%`}
          </div>
          <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
            {isGlobalPositive ? (
              <>
                <TrendingUp size={13} className="text-emerald-600" />
                <span>Excede el nivel de referencia de la industria</span>
              </>
            ) : (
              <>
                <TrendingDown size={13} className="text-rose-600" />
                <span>Por debajo del objetivo mínimo referencial</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-card border border-gray-100">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Producto</label>
            <div className="relative">
              <select
                value={selectedSku}
                onChange={(e) => setSelectedSku(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-9 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm cursor-pointer"
              >
                <option value="Todos los productos">Todos los productos</option>
                {pronosticosList?.items?.map((p: PronosticoSkuResumen) => (
                  <option key={p.sku} value={p.sku}>
                    {p.sku} - {p.nombre_producto}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Período</label>
            <div className="relative">
              <select
                value={selectedPeriodo}
                onChange={(e) => setSelectedPeriodo(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-9 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm cursor-pointer"
              >
                <option value="Últimos 6 meses">Últimos 6 meses</option>
                <option value="Últimos 3 meses">Últimos 3 meses</option>
                <option value="Año actual (2026)">Año actual (2026)</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Almacén</label>
            <div className="relative">
              <select
                value={selectedAlmacen}
                onChange={(e) => setSelectedAlmacen(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-9 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm cursor-pointer"
              >
                {(nsData?.almacenes || ['Principal']).map((alm) => (
                  <option key={alm} value={alm}>
                    Almacén {alm}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-card border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              Cumplimiento proyectado por categoría
            </h2>
            <div className="flex items-center gap-4 text-xs font-medium text-gray-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Proyectado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                <span>Referencia (Objetivo)</span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="animate-spin text-brand-700" size={32} />
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  barGap={6}
                  margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                  />
                  <YAxis
                    domain={[60, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(val: number, name: string) => [
                      `${val}%`,
                      name === 'proyectado' ? 'Nivel Proyectado' : 'Meta Referencial',
                    ]}
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <ReferenceLine
                    y={metaRef}
                    stroke="#9ca3af"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                  />
                  <Bar
                    dataKey="proyectado"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={20}
                    fill="#10b981"
                  />
                  <Bar
                    dataKey="referencia"
                    fill="#9ca3af"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-card border border-gray-100 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              Resumen de diferencias
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              El análisis actual proyecta el desempeño general analizado contra la meta de nivel de servicio (Fill Rate: {metaRef}%).
            </p>
          </div>

          {peorCategoria && (
            <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-4 text-xs text-rose-900">
              <span className="font-bold block mb-1 text-rose-800">Foco de Atención</span>
              <p className="leading-relaxed">
                En <span className="font-semibold">{peorCategoria.categoria}</span> el nivel de servicio proyectado desciende a{' '}
                <span className="font-bold">{peorCategoria.fill_rate_estimado_pct.toFixed(1)}%</span> con{' '}
                {peorCategoria.skus_en_riesgo} SKUs en riesgo de quiebre.
              </p>
            </div>
          )}

          {mejorCategoria && (
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-4 text-xs text-emerald-900">
              <span className="font-bold block mb-1 text-emerald-800">Oportunidad</span>
              <p className="leading-relaxed">
                {mejorCategoria.fill_rate_estimado_pct < metaRef ? (
                  <>
                    <span className="font-semibold">{mejorCategoria.categoria}</span> presenta el mejor desempeño con{' '}
                    <span className="font-bold">{mejorCategoria.fill_rate_estimado_pct.toFixed(1)}%</span>, aún bajo la meta de {metaRef.toFixed(0)}%.
                  </>
                ) : (
                  <>
                    <span className="font-semibold">{mejorCategoria.categoria}</span> lidera el cumplimiento con{' '}
                    <span className="font-bold">{mejorCategoria.fill_rate_estimado_pct.toFixed(1)}%</span>, consolidando la disponibilidad del catálogo.
                  </>
                )}
              </p>
            </div>
          )}

          {nsData?.nota_metodologica && (
            <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-400 flex items-start gap-1.5">
              <Info size={13} className="shrink-0 text-gray-400 mt-0.5" />
              <span>{nsData.nota_metodologica}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Historial de cumplimiento por categoría
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Mostrando {(nsData?.por_categoria || []).length} de {(nsData?.por_categoria || []).length} categorías evaluadas
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/60 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-6">Categoría</th>
                <th className="py-3 px-6 text-right">Nivel de servicio proyectado</th>
                <th className="py-3 px-6 text-right">Nivel de referencia</th>
                <th className="py-3 px-6 text-right">Diferencia</th>
                <th className="py-3 px-6 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
              {(nsData?.por_categoria || []).map((cat) => {
                const dif = cat.fill_rate_estimado_pct - metaRef;
                const isPositive = dif >= 0;
                return (
                  <tr key={cat.categoria} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-gray-900">
                      {cat.categoria}
                    </td>
                    <td className="py-3.5 px-6 text-right font-bold text-gray-900">
                      {cat.fill_rate_estimado_pct.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-6 text-right text-gray-500">
                      {metaRef.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-6 text-right font-bold">
                      <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                        {isPositive ? `+${dif.toFixed(1)}%` : `${dif.toFixed(1)}%`}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      {cat.cumple_meta ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Cumple
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                          No cumple
                        </span>
                      )}
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
