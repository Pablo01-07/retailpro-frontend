import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { modelsApi } from '@/api/models';
import { formatDateLima, formatPct } from '@/lib/formatters';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Loader2, AlertCircle } from 'lucide-react';

export const MonitoreoModeloPage: React.FC = () => {
  const { data: monitoreo, isLoading, error } = useQuery({
    queryKey: ['modelo-monitoreo'],
    queryFn: modelsApi.getMonitoreoModelo,
  });

  const { data: ficha } = useQuery({
    queryKey: ['modelo-activa'],
    queryFn: modelsApi.getFichaModeloActivo,
  });

  const umbralMape =
    monitoreo?.umbral_mape_max !== undefined && monitoreo.umbral_mape_max !== null
      ? monitoreo.umbral_mape_max
      : ficha?.umbral_mape_max !== undefined && ficha.umbral_mape_max !== null
      ? ficha.umbral_mape_max
      : null;

  const mape14dVigente =
    ficha?.mape_14d !== null && ficha?.mape_14d !== undefined
      ? ficha.mape_14d
      : monitoreo?.mape_14d !== null && monitoreo?.mape_14d !== undefined
      ? monitoreo.mape_14d
      : monitoreo?.mape_14d_promedio_historico !== null && monitoreo?.mape_14d_promedio_historico !== undefined
      ? monitoreo.mape_14d_promedio_historico
      : null;

  const mapeDiarioVigente =
    ficha?.mape !== null && ficha?.mape !== undefined
      ? ficha.mape
      : monitoreo?.mape_promedio_historico !== null && monitoreo?.mape_promedio_historico !== undefined
      ? monitoreo.mape_promedio_historico
      : null;

  const mapeVigente = mape14dVigente !== null ? mape14dVigente : mapeDiarioVigente;
  const wapeVigente = ficha?.wape !== null && ficha?.wape !== undefined ? ficha.wape : null;
  const maeVigente = ficha?.mae !== null && ficha?.mae !== undefined ? ficha.mae : null;
  const rmseVigente = ficha?.rmse !== null && ficha?.rmse !== undefined ? ficha.rmse : null;
  const coberturaVigente =
    monitoreo?.cobertura_intervalo_95 !== null && monitoreo?.cobertura_intervalo_95 !== undefined
      ? monitoreo.cobertura_intervalo_95
      : ficha?.cobertura_intervalo_95 !== null && ficha?.cobertura_intervalo_95 !== undefined
      ? ficha.cobertura_intervalo_95
      : null;

  const alertaDegradacion =
    monitoreo?.alerta_degradacion !== undefined && monitoreo.alerta_degradacion !== null
      ? monitoreo.alerta_degradacion
      : mapeVigente !== null && umbralMape !== null
      ? mapeVigente > umbralMape
      : null;

  const chartData = useMemo(() => {
    if (!monitoreo?.serie_mensual) return [];
    return monitoreo.serie_mensual.map((item, idx) => {
      const isLast = idx === monitoreo.serie_mensual.length - 1;
      const valor14d =
        item.mape_14d !== null && item.mape_14d !== undefined
          ? Number(item.mape_14d.toFixed(2))
          : item.mape !== null && item.mape !== undefined
          ? Number(item.mape.toFixed(2))
          : null;
      return {
        label: item.periodo,
        mape: valor14d,
        mape_14d: item.mape_14d !== null && item.mape_14d !== undefined ? Number(item.mape_14d.toFixed(2)) : null,
        mape_diario: item.mape !== null && item.mape !== undefined ? Number(item.mape.toFixed(2)) : null,
        corte: item.corte,
        mae: item.mae,
        rmse: item.rmse,
        estado: item.estado_alerta,
        isLast,
      };
    });
  }, [monitoreo]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400 gap-3">
        <Loader2 size={36} className="animate-spin text-brand-primary" />
        <span className="text-sm font-medium">Cargando métricas de monitoreo y backtest...</span>
      </div>
    );
  }

  if (error || !monitoreo) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-xl flex items-start gap-3">
        <AlertCircle size={24} className="shrink-0 mt-0.5" />
        <div>
          <h2 className="font-bold text-base">Error al cargar el monitoreo del modelo</h2>
          <p className="text-sm mt-1 text-rose-600">
            No se pudo obtener la serie histórica de evaluaciones desde la API.
          </p>
        </div>
      </div>
    );
  }

  const fechaUltimo = ficha?.fecha_entrenamiento ? formatDateLima(ficha.fecha_entrenamiento) : '--';
  const fechaProximo = ficha?.fecha_entrenamiento
    ? formatDateLima(new Date(new Date(ficha.fecha_entrenamiento).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
    : '--';

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
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Monitoreo y evaluación del modelo
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Vigile el desgaste de precisión del modelo predictivo y programe reentrenamientos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Estado del modelo
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-3xl font-extrabold text-gray-900">Activo</span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                alertaDegradacion === true
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : alertaDegradacion === false
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              {alertaDegradacion === true
                ? 'En observación'
                : alertaDegradacion === false
                ? 'Bueno'
                : '—'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Último reentrenamiento
          </div>
          <div className="text-3xl font-extrabold text-gray-900 mt-3">{fechaUltimo}</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Próximo reentrenamiento programado
          </div>
          <div className="text-3xl font-extrabold text-gray-900 mt-3">{fechaProximo}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">

        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4 flex flex-col justify-between"
          title="Error porcentual absoluto medio: mide el error promedio relativo de las proyecciones"
        >
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              MAPE (demanda 14 días)
            </div>
            <div
              className={`text-2xl font-bold mt-1 ${
                alertaDegradacion === true
                  ? 'text-rose-600'
                  : alertaDegradacion === false
                  ? 'text-emerald-600'
                  : 'text-gray-900'
              }`}
            >
              {mapeVigente !== null ? formatPct(mapeVigente, 2) : '—'}
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {umbralMape !== null ? `Umbral máx: ${formatPct(umbralMape, 2)}` : '—'}
          </div>
        </div>

        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4 flex flex-col justify-between"
          title="Error porcentual absoluto ponderado: mide el error total sobre las ventas reales totales"
        >
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              WAPE Vigente
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {wapeVigente !== null ? formatPct(wapeVigente, 2) : '—'}
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-1">Ponderado por volumen</div>
        </div>

        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4 flex flex-col justify-between"
          title="Error absoluto medio: promedio de desviaciones en unidades físicas"
        >
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              MAE Vigente
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {maeVigente !== null ? `${maeVigente.toFixed(2)} u.` : '—'}
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-1">Error absoluto medio</div>
        </div>

        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4 flex flex-col justify-between"
          title="Raíz del error cuadrático medio: penaliza desviaciones grandes en las ventas"
        >
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              RMSE Vigente
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {rmseVigente !== null ? `${rmseVigente.toFixed(2)} u.` : '—'}
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-1">Raíz error cuadrático</div>
        </div>

        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4 flex flex-col justify-between"
          title="Cobertura IC 95%: porcentaje de observaciones reales que cayeron dentro del intervalo de confianza proyectado al 95%"
        >
          <div>
            <div
              className="text-xs font-medium text-gray-500 uppercase tracking-wider truncate"
              title="Cobertura IC 95 % (validación secuencial)"
            >
              Cobertura IC 95 %
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {coberturaVigente !== null ? formatPct(coberturaVigente, 2) : '—'}
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-1 truncate" title="Validación secuencial">
            Validación secuencial
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-base font-bold text-gray-900">
            Evolución mensual de MAPE (demanda 14 días) vs Umbral crítico {umbralMape !== null ? `(${formatPct(umbralMape, 2)})` : ''}
          </h2>

          <div className="flex items-center gap-6 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className="w-5 h-0.5 bg-blue-600 rounded-full inline-block"></span>
              <span>MAPE 14 días</span>
            </div>
            {umbralMape !== null && (
              <div className="flex items-center gap-2">
                <span className="w-5 h-0.5 border-t-2 border-dashed border-red-500 inline-block"></span>
                <span>Límite crítico ({formatPct(umbralMape, 2)})</span>
              </div>
            )}
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 15, right: 40, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                interval={0}
                padding={{ left: 16, right: 24 }}
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                dy={5}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${val}%`}
                domain={[0, Math.max(20, Math.ceil((umbralMape ?? 15) + 5))]}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 text-xs space-y-1">
                        <div className="font-semibold text-gray-900 border-b pb-1 mb-1">
                          {label} {d.isLast ? '(Último corte)' : ''} (Corte: {d.corte})
                        </div>
                        <div className="text-blue-600 font-bold">
                          MAPE 14 días: {d.mape !== null && d.mape !== undefined ? `${Number(d.mape).toFixed(2)}%` : '—'}
                        </div>
                        {d.mape_diario !== null && d.mape_diario !== undefined && (
                          <div className="text-gray-600">
                            MAPE diario: {Number(d.mape_diario).toFixed(2)}%
                          </div>
                        )}
                        <div className="text-gray-600">
                          MAE: {d.mae !== null && d.mae !== undefined ? `${Number(d.mae).toFixed(2)} u.` : '—'}
                        </div>
                        <div className="text-gray-600">
                          RMSE: {d.rmse !== null && d.rmse !== undefined ? `${Number(d.rmse).toFixed(2)} u.` : '—'}
                        </div>
                        <div className="text-xs pt-1">
                          Estado:{' '}
                          <span
                            className={
                              umbralMape !== null && d.mape !== null && d.mape !== undefined
                                ? d.mape <= umbralMape
                                  ? 'text-emerald-600 font-semibold'
                                  : 'text-rose-600 font-semibold'
                                : 'text-gray-500'
                            }
                          >
                            {umbralMape !== null && d.mape !== null && d.mape !== undefined
                              ? d.mape <= umbralMape
                                ? 'Bajo control'
                                : 'Supera umbral'
                              : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {umbralMape !== null && (
                <ReferenceLine
                  y={umbralMape}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `${formatPct(umbralMape, 2)} Max`,
                    position: 'right',
                    fill: '#ef4444',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
              )}

              <Line
                type="monotone"
                dataKey="mape"
                name="MAPE 14 días"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls={true}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
        <div className="p-5 border-b border-gray-200/80 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Historial de evaluaciones recientes</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Mostrando {monitoreo.serie_mensual?.length ?? 0} de {monitoreo.serie_mensual?.length ?? 0} evaluaciones mensuales
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200/80 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-6">Fecha de evaluación</th>
                <th className="py-3 px-6">MAPE 14 días</th>
                <th className="py-3 px-6">MAPE diario</th>
                <th className="py-3 px-6">MAE</th>
                <th className="py-3 px-6">RMSE</th>
                <th className="py-3 px-6 text-right">Estado de validación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {monitoreo.serie_mensual?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">
                    No se registran evaluaciones históricas de backtesting.
                  </td>
                </tr>
              ) : (
                monitoreo.serie_mensual
                  ?.slice()
                  .reverse()
                  .map((item, idx) => {
                    const val14d =
                      item.mape_14d !== null && item.mape_14d !== undefined
                        ? item.mape_14d
                        : item.mape;
                    const isOk =
                      umbralMape !== null && val14d !== null && val14d !== undefined
                        ? val14d <= umbralMape
                        : null;
                    return (
                      <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-4 px-6 font-medium text-gray-800">
                          {item.periodo} ({item.corte})
                        </td>
                        <td className="py-4 px-6 font-bold tabular-nums text-gray-900">
                          {item.mape_14d !== null && item.mape_14d !== undefined
                            ? formatPct(item.mape_14d, 2)
                            : item.mape !== null && item.mape !== undefined
                            ? formatPct(item.mape, 2)
                            : '—'}
                        </td>
                        <td className="py-4 px-6 tabular-nums text-gray-700">
                          {item.mape !== null && item.mape !== undefined ? formatPct(item.mape, 2) : '—'}
                        </td>
                        <td className="py-4 px-6 text-gray-600 tabular-nums">
                          {item.mae !== null && item.mae !== undefined ? `${item.mae.toFixed(2)} unidades` : '—'}
                        </td>
                        <td className="py-4 px-6 text-gray-600 tabular-nums">
                          {item.rmse !== null && item.rmse !== undefined ? `${item.rmse.toFixed(2)} unidades` : '—'}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {isOk !== null ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                isOk
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-rose-100 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {isOk ? 'Cumple' : 'No cumple'}
                            </span>
                          ) : (
                            <span className="text-gray-400 font-medium">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};