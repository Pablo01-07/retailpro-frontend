import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { forecastsApi, TendenciasFilterParams, PronosticoSkuResumen } from '@/api/forecasts';
import { formatNumber } from '@/lib/formatters';
import {
  TrendingUp,
  TrendingDown,
  Filter,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const MONTH_NAMES: Record<string, string> = {
  '01': 'Ene',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dic',
};

export const TendenciasVentasPage: React.FC = () => {
  const [selectedCategoria, setSelectedCategoria] = useState<string>('Todas');
  const [selectedSku, setSelectedSku] = useState<string>('Todos');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');

  const { data: pronosticosList } = useQuery({
    queryKey: ['pronosticos-catalogo-tendencias'],
    queryFn: () => forecastsApi.listPronosticos(),
    staleTime: 5 * 60 * 1000,
  });

  const categorias = useMemo(() => {
    const cats = new Set<string>();
    pronosticosList?.items?.forEach((i: PronosticoSkuResumen) => cats.add(i.categoria));
    return ['Todas', ...Array.from(cats).sort()];
  }, [pronosticosList]);

  const skus = useMemo(() => {
    const s = (pronosticosList?.items || [])
      .filter((i: PronosticoSkuResumen) => selectedCategoria === 'Todas' || i.categoria === selectedCategoria)
      .map((i: PronosticoSkuResumen) => i.sku);
    return ['Todos', ...s.sort()];
  }, [pronosticosList, selectedCategoria]);

  const [appliedFilters, setAppliedFilters] = useState<TendenciasFilterParams>({});

  const {
    data: tendenciasData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['pronosticos-tendencias', appliedFilters],
    queryFn: () => forecastsApi.getTendencias(appliedFilters),
    staleTime: 30000,
  });

  const handleApplyFilters = () => {
    const params: TendenciasFilterParams = {};
    if (selectedCategoria && selectedCategoria !== 'Todas') {
      params.categoria = selectedCategoria;
    }
    if (selectedSku && selectedSku !== 'Todos') {
      params.sku = selectedSku;
    }
    if (fechaInicio) {
      params.fecha_inicio = fechaInicio;
    }
    if (fechaFin) {
      params.fecha_fin = fechaFin;
    }
    setAppliedFilters(params);
  };

  const handleClearFilters = () => {
    setSelectedCategoria('Todas');
    setSelectedSku('Todos');
    setFechaInicio('');
    setFechaFin('');
    setAppliedFilters({});
  };

  const chartData = useMemo(() => {
    if (!tendenciasData?.items) return [];
    return tendenciasData.items.map((it) => {
      const parts = it.mes.split('-');
      const year = parts[0];
      const month = parts[1];
      const monthLabel = MONTH_NAMES[month] || it.mes;
      const rangoExacto = `02/${month}/${year} al 15/${month}/${year} (14 días)`;
      return {
        name: monthLabel,
        mesCompleto: `${monthLabel} ${year}`,
        rangoExacto,
        real: Math.round(it.venta_real),
        pronostico: Math.round(it.venta_proyectada),
      };
    });
  }, [tendenciasData]);

  const variacionMesAnterior = useMemo(() => {
    if (!tendenciasData?.items || tendenciasData.items.length < 2) return null;
    const items = tendenciasData.items;
    const ultimo = items[items.length - 1].venta_real;
    const penultimo = items[items.length - 2].venta_real;
    if (penultimo === 0) return 0;
    return ((ultimo - penultimo) / penultimo) * 100;
  }, [tendenciasData]);

  const tableData = useMemo(() => {
    if (!tendenciasData?.items) return [];
    return [...tendenciasData.items].reverse().map((it) => {
      const parts = it.mes.split('-');
      const year = parts[0];
      const month = parts[1];
      const monthName = MONTH_NAMES[month] || '';
      const periodoLabel = `${monthName} ${year} (02/${month} al 15/${month})`;
      const dif = it.venta_real - it.venta_proyectada;
      const varPct = it.venta_proyectada > 0 ? (dif / it.venta_proyectada) * 100 : 0;
      return {
        mes: it.mes,
        periodoLabel,
        rangoExacto: `02/${month}/${year} al 15/${month}/${year}`,
        ventaReal: it.venta_real,
        ventaPronostico: it.venta_proyectada,
        diferencia: dif,
        variacionPct: varPct,
      };
    });
  }, [tendenciasData]);

  return (
    <div className="space-y-6">

      <div className="flex items-center gap-6 border-b border-gray-200 text-sm font-medium">
        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Dashboard Ejecutivo
        </NavLink>
        <NavLink
          to="/dashboard/tendencias"
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Tendencias de Ventas
        </NavLink>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Tendencias de demanda: Ventas reales vs. proyectadas (Ventana de evaluación de 14 días por mes)
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Evaluación fuera de muestra del modelo predictivo sobre ventanas fijas de 14 días (del 02 al 15 de cada mes) en el backtesting walk-forward.
        </p>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-card border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Rango de fechas (Desde / Hasta)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm"
              />
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Categoría
            </label>
            <div className="relative">
              <select
                value={selectedCategoria}
                onChange={(e) => setSelectedCategoria(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3.5 py-2 pr-9 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm cursor-pointer"
              >
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
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
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Producto / SKU
            </label>
            <div className="relative">
              <select
                value={selectedSku}
                onChange={(e) => setSelectedSku(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3.5 py-2 pr-9 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm cursor-pointer"
              >
                {skus.map((sku) => (
                  <option key={sku} value={sku}>
                    {sku}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyFilters}
              disabled={isFetching}
              className="flex-1 bg-brand-700 hover:bg-brand-800 text-white font-medium text-xs py-2.5 px-4 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isFetching ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Filter size={14} />
              )}
              <span>Aplicar filtros</span>
            </button>
            <button
              onClick={handleClearFilters}
              disabled={isFetching}
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium text-xs py-2.5 px-3 rounded-lg transition-colors shadow-sm"
              title="Restablecer filtros"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-card border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Histórico vs. Pronóstico: Ventana de evaluación de 14 días por mes ({chartData.length} cortes evaluados)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Cada barra representa la suma de la ventana de 14 días del corte Walk-Forward correspondiente (del día 02 al 15 de cada mes).
            </p>
            {variacionMesAnterior !== null && !isNaN(variacionMesAnterior) ? (
              <div
                className={`text-xs font-medium mt-1 flex items-center gap-1 ${
                  variacionMesAnterior >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {variacionMesAnterior >= 0 ? (
                  <TrendingUp size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
                <span>
                  {variacionMesAnterior >= 0 ? '+' : ''}
                  {variacionMesAnterior.toFixed(1)}% vs. corte mensual anterior
                </span>
              </div>
            ) : (
              <div className="text-xs font-medium mt-1 text-gray-400">
                Tendencia vs. corte anterior: —
              </div>
            )}
          </div>

          <div className="flex items-center gap-5 text-xs font-medium text-gray-600">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Ventas reales</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Ventas pronosticadas</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="animate-spin text-brand-700" size={32} />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400 text-sm">
            <p>No se encontraron datos de ventas para los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                barGap={8}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 text-xs space-y-1.5">
                          <p className="font-bold text-gray-900">{d.mesCompleto}</p>
                          <p className="text-[11px] text-gray-500 font-medium pb-1 border-b border-gray-100">
                            Ventana evaluada: {d.rangoExacto}
                          </p>
                          <div className="flex items-center justify-between gap-4 text-emerald-700 font-semibold">
                            <span>Real:</span>
                            <span>{formatNumber(d.real)} u</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-blue-700 font-semibold">
                            <span>Pronóstico:</span>
                            <span>{formatNumber(d.pronostico)} u</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-gray-500 text-[11px] pt-1 border-t border-gray-100">
                            <span>Diferencia:</span>
                            <span>{formatNumber(Math.abs(d.real - d.pronostico))} u</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="real" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="pronostico" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-500">
              * <span className="font-semibold">Nota metodológica sobre todos los meses:</span> Cada barra mensual no suma los 30 días del calendario, sino estrictamente la ventana de evaluación de 14 días (del día 02 al 15 de cada mes) establecida para el backtesting walk-forward. Ambas barras (real y pronosticada) comparan exactamente los mismos 14 días.
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Detalle mensual de desviaciones
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Mostrando {tableData.length} de {tableData.length} períodos evaluados
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/60 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-6">Período</th>
                <th className="py-3 px-6 text-right">Ventas reales</th>
                <th className="py-3 px-6 text-right">Ventas pronosticadas</th>
                <th className="py-3 px-6 text-right">Diferencia</th>
                <th className="py-3 px-6 text-right">Variación %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
              {tableData.map((row) => {
                const isPositive = row.diferencia >= 0;
                return (
                  <tr key={row.mes} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-gray-900">
                      {row.periodoLabel}
                    </td>
                    <td className="py-3.5 px-6 text-right font-bold text-gray-900">
                      {formatNumber(row.ventaReal)} u
                    </td>
                    <td className="py-3.5 px-6 text-right text-gray-600">
                      {formatNumber(row.ventaPronostico)} u
                    </td>
                    <td className="py-3.5 px-6 text-right font-bold">
                      <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                        {isPositive ? `+${formatNumber(row.diferencia)} u` : `${formatNumber(row.diferencia)} u`}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right font-bold">
                      {row.variacionPct !== null && row.variacionPct !== undefined && !isNaN(row.variacionPct) ? (
                        <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                          {isPositive ? `+${row.variacionPct.toFixed(1)}%` : `${row.variacionPct.toFixed(1)}%`}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-medium">—</span>
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
