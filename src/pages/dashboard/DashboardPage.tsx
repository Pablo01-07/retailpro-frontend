import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/useAuth';
import { dashboardApi } from '@/api/dashboard';
import { forecastsApi } from '@/api/forecasts';
import { formatNumber, formatDateLima, formatDateTimeLima } from '@/lib/formatters';
import { AlertBanner } from '@/components/common/AlertBanner';
import {
  Package,
  DollarSign,
  AlertTriangle,
  AlertOctagon,
  ChevronDown,
  Layers,
  ExternalLink,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const CATEGORY_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [diasPeriodo, setDiasPeriodo] = useState<number>(30);
  const [showPowerBi, setShowPowerBi] = useState(false);

  const {
    data: dashboardData,
    isLoading: isDashLoading,
    error: dashError,
  } = useQuery({
    queryKey: ['dashboard-resumen'],
    queryFn: () => dashboardApi.getResumen(),
    staleTime: 30000,
  });

  const { data: topProductsData } = useQuery({
    queryKey: ['dashboard-top-productos', diasPeriodo],
    queryFn: () => dashboardApi.getProductosMasVendidos(diasPeriodo),
    staleTime: 30000,
  });

  const { data: powerBiData } = useQuery({
    queryKey: ['dashboard-powerbi'],
    queryFn: () => dashboardApi.getPowerBi(),
    staleTime: 60000,
  });

  const { data: tendenciasData } = useQuery({
    queryKey: ['pronosticos-tendencias-dash'],
    queryFn: () => forecastsApi.getTendencias(),
    staleTime: 60000,
  });

  const totalSkus = dashboardData?.categorias.reduce((acc, c) => acc + c.total_skus, 0) || 0;
  const stockTotal = dashboardData?.categorias.reduce((acc, c) => acc + c.stock_total, 0) || 0;
  const kpiValorInv = dashboardData?.kpis.find((k) =>
    k.nombre.toLowerCase().includes('valor') || k.unidad === 'PEN'
  )?.valor_numerico;
  const valorInventarioEstimado = kpiValorInv !== undefined ? kpiValorInv : (stockTotal > 0 ? stockTotal * 6.25 : 0);

  const topRiesgoItems = dashboardData?.top_riesgo_quiebre || [];
  const stockBajoCount = topRiesgoItems.length;

  const kpiAlertasCriticasItem = dashboardData?.kpis.find((k) =>
    k.nombre.toLowerCase().includes('críticas') || k.nombre.toLowerCase().includes('criticas')
  );
  const kpiAlertasCriticas = kpiAlertasCriticasItem?.valor_numerico;
  const alertasCriticasCount = kpiAlertasCriticas !== undefined ? Math.round(kpiAlertasCriticas) : 0;

  const kpiTotalSkusItem = dashboardData?.kpis.find((k) =>
    k.nombre.toLowerCase().includes('total productos') || k.nombre.toLowerCase().includes('catálogo') || k.nombre.toLowerCase().includes('catalogo')
  );
  const kpiValorInvItem = dashboardData?.kpis.find((k) =>
    k.nombre.toLowerCase().includes('valor') || k.unidad === 'PEN'
  );
  const kpiStockBajoItem = dashboardData?.kpis.find((k) =>
    k.nombre.toLowerCase().includes('advertencias')
  );

  const formatTendencia = (val?: number | null): string => {
    if (val === null || val === undefined || isNaN(val)) {
      return '—';
    }
    const isPos = val >= 0;
    return `${isPos ? '+' : ''}${val.toFixed(1)}%`;
  };

  const topProductsLimit = 10;
  const topProductsList = (topProductsData || []).slice(0, topProductsLimit);
  const displayedTopCount = topProductsList.length;
  const totalCatalogSkus = totalSkus || topProductsData?.length || 0;
  const hasMoreProducts = totalCatalogSkus > displayedTopCount;

  const displayedRiesgoCount = topRiesgoItems.length;
  const totalRiesgoSkus = stockBajoCount;

  const periodoInicio = topProductsData?.[0]?.fecha_inicio ? formatDateLima(topProductsData[0].fecha_inicio) : '';
  const periodoFin = topProductsData?.[0]?.fecha_fin ? formatDateLima(topProductsData[0].fecha_fin) : '';
  const periodoTexto = periodoInicio && periodoFin ? ` del ${periodoInicio} al ${periodoFin}` : '';

  const chartVentasData = React.useMemo(() => {
    const rawItems = tendenciasData?.items?.length ? tendenciasData.items.slice(-6) : [];

    const monthsNameMap: Record<string, string> = {
      '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun',
      '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
    };

    return rawItems.map((item) => {
      const parts = item.mes.split('-');
      const year = parts[0];
      const month = parts[1];
      const label = monthsNameMap[month] || item.mes;
      const rangoExacto = `02/${month}/${year} al 15/${month}/${year} (14 días acumulados)`;
      return {
        name: label,
        mesCompleto: `${label} ${year}`,
        rangoExacto,
        real: Math.round(item.venta_real),
        pronostico: Math.round(item.venta_proyectada),
      };
    });
  }, [tendenciasData]);

  const donutData = React.useMemo(() => {
    if (!dashboardData?.categorias || dashboardData.categorias.length === 0) return [];
    const total = dashboardData.categorias.reduce((acc, c) => acc + c.stock_total, 0) || 1;
    return dashboardData.categorias.map((c, i) => ({
      name: c.categoria,
      value: c.stock_total,
      pct: Math.round((c.stock_total / total) * 100),
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));
  }, [dashboardData]);

  const firstName = user?.nombre_completo ? user.nombre_completo.split(' ')[0] : (user?.correo?.split('@')[0] || 'Usuario');

  if (isDashLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
        <Loader2 className="animate-spin text-brand-700" size={36} />
        <p className="text-sm text-gray-500 font-medium">Cargando panel de control consolidado...</p>
      </div>
    );
  }

  if (dashError) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-xl">
        <h3 className="font-semibold text-lg">Error al cargar datos del Dashboard</h3>
        <p className="text-sm mt-1">No se pudo establecer conexión con el servicio de analítica.</p>
      </div>
    );
  }

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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Bienvenido, {firstName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Panel de control consolidado y pronóstico de stock para hoy.
          </p>
        </div>

        <div className="flex items-center gap-3">

          {powerBiData?.enabled && (
            <button
              onClick={() => setShowPowerBi(!showPowerBi)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-brand-700 text-brand-800 bg-brand-50 hover:bg-brand-100 transition-colors shadow-sm"
            >
              <Layers size={15} />
              {showPowerBi ? 'Ver Vista Nativa' : 'Ver Power BI Embebido'}
            </button>
          )}

          <div className="relative inline-block text-left">
            <select
              value={diasPeriodo}
              onChange={(e) => setDiasPeriodo(Number(e.target.value))}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm cursor-pointer"
            >
              <option value={14}>Últimos 14 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 90 días</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {dashboardData?.datos_desactualizados && (
        <AlertBanner
          type="warning"
          message={`Los datos mostrados fueron actualizados por última vez el ${formatDateTimeLima(dashboardData.ultima_actualizacion_datos)} (hace más de 48 horas) y podrían no reflejar el estado actual del inventario.`}
        />
      )}

      {showPowerBi && powerBiData?.embed_url ? (
        <div className="bg-white rounded-xl shadow-card border border-gray-100 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <span className="text-sm font-semibold text-gray-800">
              Reporte Oficial Power BI - FasRetail Lima
            </span>
            <a
              href={powerBiData.embed_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-700 hover:underline flex items-center gap-1"
            >
              Abrir en nueva pestaña <ExternalLink size={12} />
            </a>
          </div>
          <iframe
            src={powerBiData.embed_url}
            title="RetailPro Power BI Report"
            className="w-full h-[650px] rounded-lg border-0"
            allowFullScreen
          />
        </div>
      ) : (
        <>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

            <div className="bg-white rounded-xl p-5 shadow-card border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Total productos
                    </span>
                    <div className="text-2xl font-bold text-gray-900 mt-1.5">
                      {totalSkus !== undefined && totalSkus !== null && !isNaN(totalSkus)
                        ? formatNumber(totalSkus)
                        : '—'}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                    <Package size={20} />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  SKUs activos en catálogo maestro
                </p>
              </div>
              <div className="text-xs text-gray-500 font-medium mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                <span>{dashboardData?.categorias.length || 0} categorías activas</span>
                <span className="text-gray-400 tabular-nums text-[11px]">
                  Tend: {formatTendencia(kpiTotalSkusItem?.tendencia_pct)}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-card border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Valor del inventario
                    </span>
                    <div className="text-2xl font-bold text-gray-900 mt-1.5">
                      {valorInventarioEstimado !== undefined && valorInventarioEstimado !== null && !isNaN(valorInventarioEstimado)
                        ? `S/ ${formatNumber(valorInventarioEstimado)}`
                        : '—'}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                    <DollarSign size={20} />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Valorización según costo unitario
                </p>
              </div>
              <div className="text-xs text-gray-500 font-medium mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                <span>Valorización de stock</span>
                <span className={kpiValorInvItem?.tendencia_pct !== null && kpiValorInvItem?.tendencia_pct !== undefined ? 'text-gray-600 font-medium text-[11px]' : 'text-gray-400 text-[11px]'}>
                  Tend: {formatTendencia(kpiValorInvItem?.tendencia_pct)}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-card border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Stock bajo
                    </span>
                    <div className="text-2xl font-bold text-amber-500 mt-1.5">
                      {stockBajoCount !== undefined && stockBajoCount !== null && !isNaN(stockBajoCount)
                        ? `${stockBajoCount} SKU`
                        : '—'}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
                    <AlertTriangle size={20} />
                  </div>
                </div>
                <p className="text-[11px] text-amber-700 font-medium mt-1">
                  Stock actual &le; punto de reorden (pedido preventivo)
                </p>
              </div>
              <div className="text-xs text-gray-500 font-medium mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                <span>Reorden preventivo</span>
                <span className={kpiStockBajoItem?.tendencia_pct !== null && kpiStockBajoItem?.tendencia_pct !== undefined ? 'text-gray-600 font-medium text-[11px]' : 'text-gray-400 text-[11px]'}>
                  Tend: {formatTendencia(kpiStockBajoItem?.tendencia_pct)}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-card border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      En riesgo crítico de quiebre
                    </span>
                    <div className="text-2xl font-bold text-rose-600 mt-1.5">
                      {alertasCriticasCount !== undefined && alertasCriticasCount !== null && !isNaN(alertasCriticasCount)
                        ? `${alertasCriticasCount} SKU`
                        : '—'}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
                    <AlertOctagon size={20} />
                  </div>
                </div>
                <p className="text-[11px] text-rose-600 font-medium mt-1">
                  Demanda supera stock antes de reponer (quiebre inminente)
                </p>
              </div>
              <div className="text-xs text-rose-600 font-medium mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                <span>Prioridad alta</span>
                <span className="text-gray-400 text-[11px]">
                  Tend: {formatTendencia(kpiAlertasCriticasItem?.tendencia_pct)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-card border border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Ventas reales vs. pronosticadas (Ventana de evaluación de 14 días por mes)
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Cada barra representa la suma de la ventana de 14 días del corte Walk-Forward correspondiente (del día 02 al 15 de cada mes).
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-gray-600 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Real</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span>Pronóstico</span>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartVentasData}
                    barGap={6}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
                                <span>{formatNumber(d.real)} und.</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-blue-700 font-semibold">
                                <span>Pronóstico:</span>
                                <span>{formatNumber(d.pronostico)} und.</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-gray-500 text-[11px] pt-1 border-t border-gray-100">
                                <span>Diferencia:</span>
                                <span>{formatNumber(Math.abs(d.real - d.pronostico))} und.</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="real" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={18} />
                    <Bar dataKey="pronostico" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-card border border-gray-100 flex flex-col justify-between">
              <h2 className="text-base font-semibold text-gray-900 mb-2">
                Distribución del inventario
              </h2>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-auto py-2">
                <div className="w-36 h-36 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={56}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {donutData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2.5 text-xs">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-gray-800 font-medium whitespace-nowrap">{item.name}</span>
                      <span className="font-bold text-gray-900 ml-auto pl-3 tabular-nums">{item.pct}%</span>
                      <span className="text-gray-500 text-[11px] tabular-nums">({formatNumber(item.value)} u)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500 text-center">
                Total de {formatNumber(stockTotal)} unidades en catálogo
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Top {displayedTopCount} productos más vendidos
                  </h2>
                  <span className="text-[11px] text-gray-500 block mt-0.5">
                    Mostrando {displayedTopCount} de {totalCatalogSkus} productos, ordenados por unidades vendidas{periodoTexto} (últimos {diasPeriodo} días)
                  </span>
                </div>
                {hasMoreProducts && (
                  <Link
                    to="/dashboard/tendencias"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors shrink-0"
                  >
                    <span>Ver todos</span>
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/60 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-5">Producto</th>
                      <th className="py-3 px-5">Categoría</th>
                      <th className="py-3 px-5 text-right">Ventas</th>
                      <th className="py-3 px-5 text-right">Variación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
                    {topProductsList.map((p) => {
                      const hasVar =
                        p.variacion_pct !== null &&
                        p.variacion_pct !== undefined &&
                        !isNaN(p.variacion_pct);
                      const isPositive = hasVar && p.variacion_pct >= 0;
                      return (
                        <tr key={p.sku} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 px-5 font-semibold text-gray-900 max-w-[200px] truncate" title={p.nombre}>
                            {p.nombre}
                          </td>
                          <td className="py-3.5 px-5 text-gray-500">{p.categoria}</td>
                          <td className="py-3.5 px-5 text-right font-bold tabular-nums text-gray-900">
                            {formatNumber(p.unidades_vendidas)} u
                          </td>
                          <td className="py-3.5 px-5 text-right tabular-nums">
                            {hasVar ? (
                              <span
                                className={
                                  isPositive
                                    ? 'text-emerald-600 font-bold'
                                    : 'text-rose-600 font-bold'
                                }
                              >
                                {isPositive ? `+${p.variacion_pct.toFixed(1)}%` : `${p.variacion_pct.toFixed(1)}%`}
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

            <div className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Stock bajo o agotado
                  </h2>
                  <span className="text-[11px] text-gray-500 block mt-0.5">
                    Mostrando {displayedRiesgoCount} de {totalRiesgoSkus} productos con stock igual o menor a su punto de reorden
                  </span>
                </div>
                <Link
                  to="/inventarios"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors shrink-0"
                >
                  <span>Ver todos</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/60 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-5">Producto</th>
                      <th className="py-3 px-5">SKU</th>
                      <th className="py-3 px-5 text-right">Stock actual</th>
                      <th className="py-3 px-5 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
                    {topRiesgoItems.map((p) => {
                      const isAgotado = p.stock_actual === 0;
                      return (
                        <tr key={p.sku} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 px-5 font-semibold text-gray-900 truncate max-w-[170px]" title={p.nombre}>
                            {p.nombre}
                          </td>
                          <td className="py-3.5 px-5 text-gray-500">{p.sku}</td>
                          <td className="py-3.5 px-5 text-right font-bold tabular-nums text-gray-900">
                            {p.stock_actual} u
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            {isAgotado ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                                Agotado
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                Stock bajo
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
        </>
      )}
    </div>
  );
};
