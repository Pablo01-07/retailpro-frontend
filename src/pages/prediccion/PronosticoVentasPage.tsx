import React, { useState, useMemo, useEffect } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { forecastsApi } from '@/api/forecasts';
import { processesApi } from '@/api/processes';
import { useAuth } from '@/auth/useAuth';
import { formatDateLima, formatDateOnly, formatDayMonthLima, formatNumber, formatPct } from '@/lib/formatters';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
} from 'recharts';
import {
  Sparkles,
  Loader2,
  Calendar,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
} from 'lucide-react';
import { AlertBanner } from '@/components/common/AlertBanner';
import { Badge } from '@/components/common/Badge';

export const PronosticoVentasPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const canGenerate = user?.rol === 'administrador' || user?.rol === 'analista';

  const urlSku = searchParams.get('sku')?.trim().toUpperCase() || '';
  const [selectedSku, setSelectedSku] = useState<string>(urlSku);
  const [selectedCategoria, setSelectedCategoria] = useState<string>('Todas');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const {
    data: listData,
    isLoading: isListLoading,
    error: listError,
  } = useQuery({
    queryKey: ['pronosticos', selectedCategoria],
    queryFn: () =>
      forecastsApi.listPronosticos(
        selectedCategoria === 'Todas' ? undefined : selectedCategoria,
        true
      ),
  });

  const categorias = useMemo(() => {
    if (!listData?.items) return ['Todas'];
    const cats = Array.from(new Set(listData.items.map((i) => i.categoria).filter(Boolean)));
    return ['Todas', ...cats];
  }, [listData]);

  useEffect(() => {
    if (urlSku) {
      setSelectedSku(urlSku);
      return;
    }
    if (listData?.items && listData.items.length > 0) {
      const exists = listData.items.some((i) => i.sku === selectedSku);
      if (!selectedSku || !exists) {
        setSelectedSku(listData.items[0].sku);
      }
    }
  }, [listData, urlSku, selectedSku]);

  const handleSkuChange = (newSku: string) => {
    setSelectedSku(newSku);
    setSearchParams(newSku ? { sku: newSku } : {});
  };

  const {
    data: skuDetalle,
    isLoading: isSkuLoading,
    error: skuError,
  } = useQuery({
    queryKey: ['pronostico-sku', selectedSku],
    queryFn: () => forecastsApi.getForecastBySku(selectedSku),
    enabled: !!selectedSku,
    retry: false,
  });

  const isSku422 = (skuError as any)?.response?.status === 422;
  const sku422Message =
    (skuError as any)?.response?.data?.detail ||
    'No se generan pronósticos para este producto';

  const generarMutation = useMutation({
    mutationFn: () => processesApi.ejecutarProceso('pronostico'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pronosticos'] });
      await queryClient.invalidateQueries({ queryKey: ['pronostico-sku'] });
      await queryClient.refetchQueries({ queryKey: ['pronostico-sku', selectedSku] });
      setSuccessBanner('Pronóstico generado exitosamente con el motor inteligente.');
      setTimeout(() => setSuccessBanner(null), 4000);
    },
  });

  const chartData = useMemo(() => {
    if (!skuDetalle) return [];

    const data: Array<{
      fechaLabel: string;
      rawDate: string;
      ventas_reales?: number | null;
      ventas_proyectadas?: number | null;
      inf?: number | null;
      sup?: number | null;
      isToday?: boolean;
    }> = [];

    const historicoCompleto = skuDetalle.historico_reciente || [];
    const historico = historicoCompleto.slice(-14);
    const hayPronostico = skuDetalle.pronostico_disponible !== false;

    historico.forEach((h, idx) => {
      const isLast = idx === historico.length - 1;
      data.push({
        fechaLabel: formatDayMonthLima(h.fecha),
        rawDate: h.fecha,
        ventas_reales: Math.round(h.cantidad_vendida),
        ventas_proyectadas: isLast && hayPronostico ? Math.round(h.cantidad_vendida) : undefined,
        isToday: isLast,
      });
    });

    if (hayPronostico) {
      const serie14 = skuDetalle.serie_14_dias || [];
      serie14.forEach((d) => {
        data.push({
          fechaLabel: formatDayMonthLima(d.fecha_objetivo),
          rawDate: d.fecha_objetivo,
          ventas_proyectadas: Math.round(d.cantidad_proyectada),
          inf: Math.round(d.intervalo_confianza_inf),
          sup: Math.round(d.intervalo_confianza_sup),
        });
      });
    }

    return data;
  }, [skuDetalle]);

  const incertidumbreBadge = useMemo(() => {
    if (!skuDetalle?.nivel_incertidumbre) return null;
    const nivel = skuDetalle.nivel_incertidumbre.trim().toUpperCase();

    if (nivel === 'ALTO') {
      return (
        <Badge
          variant="danger"
          title="El SKU presenta alta variabilidad histórica en sus ventas; interprete la proyección con cautela."
        >
          Alta incertidumbre
        </Badge>
      );
    }
    if (nivel === 'MEDIO') {
      return (
        <Badge variant="warning">
          Incertidumbre media
        </Badge>
      );
    }
    if (nivel === 'BAJO') {
      return (
        <Badge variant="success">
          Incertidumbre baja
        </Badge>
      );
    }
    return null;
  }, [skuDetalle?.nivel_incertidumbre]);

  const fechaGeneracion = skuDetalle
    ? skuDetalle.fecha_generacion
    : listData?.fecha_generacion;

  const serieConVariacion = useMemo(() => {
    if (!skuDetalle?.serie_14_dias) return [];
    const serie = skuDetalle.serie_14_dias;
    const ultimaVenta = skuDetalle.historico_reciente?.length
      ? skuDetalle.historico_reciente[skuDetalle.historico_reciente.length - 1].cantidad_vendida
      : serie[0].cantidad_proyectada;

    return serie.map((item, index) => {
      const prevVal = index === 0 ? ultimaVenta : serie[index - 1].cantidad_proyectada;
      let varPct = 0;
      if (prevVal > 0) {
        varPct = ((item.cantidad_proyectada - prevVal) / prevVal) * 100;
      }
      return {
        ...item,
        variacionPct: varPct,
      };
    });
  }, [skuDetalle]);

  const isLoading = isListLoading || (!!selectedSku && isSkuLoading);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6 border-b border-gray-200 text-sm font-medium">
        <NavLink
          to="/prediccion"
          end
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Pronóstico de Ventas
        </NavLink>
        <NavLink
          to="/prediccion/ficha"
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Ficha Técnica
        </NavLink>
        <NavLink
          to="/prediccion/monitoreo"
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Monitoreo del Modelo
        </NavLink>
        <NavLink
          to="/prediccion/historial"
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Historial y SHAP
        </NavLink>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Pronóstico de ventas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Visualice el pronóstico inteligente y planifique sus inventarios basados en IA.
        </p>
      </div>

      {successBanner && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-600 hover:text-emerald-800 font-medium text-xs"
          >
            Cerrar
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Producto/SKU
            </label>
            <select
              value={selectedSku}
              onChange={(e) => handleSkuChange(e.target.value)}
              disabled={isListLoading}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-all disabled:opacity-50"
            >
              {listData?.items?.map((item) => {
                const isDescontinuado = (item.estado || '').toLowerCase() === 'descontinuado';
                const isHistorialInsuficiente = item.historial_suficiente === false;
                let etiquetaSuffix = '';
                if (isDescontinuado) {
                  etiquetaSuffix = ' (descontinuado)';
                } else if (isHistorialInsuficiente) {
                  etiquetaSuffix = ' (historial insuficiente)';
                }
                return (
                  <option key={item.sku} value={item.sku}>
                    {item.sku} - {item.nombre_producto}
                    {etiquetaSuffix}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Categoría
            </label>
            <select
              value={selectedCategoria}
              onChange={(e) => setSelectedCategoria(e.target.value)}
              disabled={isListLoading}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-all disabled:opacity-50"
            >
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Horizonte
            </label>
            <select
              disabled
              value="14"
              className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-700 cursor-not-allowed"
            >
              <option value="14">Próximos 14 días</option>
            </select>
          </div>
        </div>

        <div
          className="shrink-0 pt-2 md:pt-0"
          title={
            !canGenerate
              ? 'La generación de pronósticos está reservada para Administrador y Analista'
              : undefined
          }
        >
          <button
            type="button"
            onClick={() => generarMutation.mutate()}
            disabled={!canGenerate || generarMutation.isPending}
            className={`w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 font-semibold text-sm rounded-lg shadow-sm transition-all ${
              canGenerate
                ? 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white cursor-pointer disabled:opacity-60'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-60 border border-gray-300'
            }`}
          >
            {generarMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Generar pronóstico</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isSku422 && (
        <AlertBanner
          type="warning"
          message={sku422Message}
        />
      )}

      {(listError || (skuError && !isSku422)) && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">No se pudo cargar la información de pronóstico</div>
            <div className="text-xs mt-1 text-rose-600">
              Verifique que el backend esté operativo y que existan ventas registradas para el SKU seleccionado.
            </div>
          </div>
        </div>
      )}

      {!isSku422 && skuDetalle && skuDetalle.pronostico_disponible === false && (
        <AlertBanner
          type="warning"
          message="Pronóstico no disponible para este producto"
        />
      )}

      {!isSku422 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-gray-900">Evolución de ventas y proyección</h2>
                {incertidumbreBadge}
              </div>

              <div className="flex items-center gap-5 mt-2 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-0.5 bg-emerald-500 rounded-full inline-block"></span>
                  <span>Ventas reales (Histórico)</span>
                </div>
                {skuDetalle?.pronostico_disponible !== false && (
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-0.5 border-t-2 border-dashed border-blue-600 inline-block"></span>
                    <span>Ventas pronosticadas (Proyección)</span>
                  </div>
                )}
              </div>
            </div>

            {fechaGeneracion ? (
              <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" />
                <span>
                  Pronóstico con datos hasta:{' '}
                  {formatDateOnly(fechaGeneracion)}
                </span>
              </div>
            ) : null}
          </div>

          <div className="h-72 w-full">
            {isLoading ? (
              <div className="h-full flex items-center justify-center flex-col gap-2 text-gray-400">
                <Loader2 size={32} className="animate-spin text-brand-primary" />
                <span className="text-xs font-medium">Cargando serie temporal...</span>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No hay datos suficientes para graficar la serie temporal del SKU {selectedSku}.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="fechaLabel"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    dy={5}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val}`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const dataPoint = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 text-xs space-y-1">
                            <div className="font-semibold text-gray-900 border-b pb-1 mb-1">
                              {label}
                            </div>
                            {dataPoint.ventas_reales !== undefined && (
                              <div className="text-emerald-700 font-medium">
                                Venta Real: {dataPoint.ventas_reales} u.
                              </div>
                            )}
                            {dataPoint.ventas_proyectadas !== undefined && (
                              <div className="text-blue-700 font-medium">
                                Proyección: {dataPoint.ventas_proyectadas} u.
                              </div>
                            )}
                            {dataPoint.inf !== undefined && dataPoint.sup !== undefined && (
                              <div className="text-gray-500 text-[11px]">
                                IC 95%: [{dataPoint.inf} - {dataPoint.sup}] u.
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  {skuDetalle?.pronostico_disponible !== false && (
                    <Area
                      type="monotone"
                      dataKey="sup"
                      stroke="none"
                      fill="#dbeafe"
                      fillOpacity={0.5}
                    />
                  )}

                  <Line
                    type="monotone"
                    dataKey="ventas_reales"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#10b981' }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                    connectNulls={false}
                  />

                  {skuDetalle?.pronostico_disponible !== false && (
                    <Line
                      type="monotone"
                      dataKey="ventas_proyectadas"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      strokeDasharray="4 4"
                      dot={{ r: 3, fill: '#2563eb' }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {!isSku422 && skuDetalle?.pronostico_disponible !== false && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
          <div className="p-5 border-b border-gray-200/80 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Detalle de proyecciones</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Mostrando {serieConVariacion.length} de {serieConVariacion.length} días proyectados
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200/80 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-6">Fecha</th>
                  <th className="py-3 px-6">Ventas pronosticadas (Unidades)</th>
                  <th
                    className="py-3 px-6 cursor-help"
                    title="Intervalo de confianza al 95%: rango donde se proyecta la demanda real con 95% de certeza estadística"
                  >
                    Intervalo de confianza (95%)
                  </th>
                  <th className="py-3 px-6 text-right">Variación estimada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-4 px-6">
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div>
                      </td>
                    </tr>
                  ))
                ) : serieConVariacion.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500 text-sm">
                      No hay proyecciones registradas para el SKU seleccionado.
                    </td>
                  </tr>
                ) : (
                  serieConVariacion.map((item) => {
                    const isPositive = item.variacionPct >= 0;
                    return (
                      <tr key={item.fecha_objetivo} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-4 px-6 font-medium tabular-nums text-gray-800">
                          {formatDateLima(item.fecha_objetivo)}
                        </td>
                        <td className="py-4 px-6 font-bold tabular-nums text-gray-900">
                          {formatNumber(item.cantidad_proyectada)} unidades
                        </td>
                        <td className="py-4 px-6 text-gray-600 tabular-nums text-xs">
                          [{formatNumber(item.intervalo_confianza_inf)} -{' '}
                          {formatNumber(item.intervalo_confianza_sup)}]
                        </td>
                        <td className="py-4 px-6 text-right font-medium tabular-nums">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              isPositive ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {isPositive ? '+' : ''}
                            {formatPct(item.variacionPct, 1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
