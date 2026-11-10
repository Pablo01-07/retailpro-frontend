import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { modelsApi } from '@/api/models';
import { useAuth } from '@/auth/useAuth';
import { AlertBanner } from '@/components/common/AlertBanner';
import { formatDateLima, formatPct, formatModelVersion } from '@/lib/formatters';
import { CheckCircle2, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

export const FichaModeloPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'administrador';
  const queryClient = useQueryClient();
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const reevaluarMutation = useMutation({
    mutationFn: modelsApi.reevaluarModeloActivo,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['modelo-activa'] });
      queryClient.invalidateQueries({ queryKey: ['modelo-monitoreo'] });
      queryClient.invalidateQueries({ queryKey: ['historial-modelos'] });
      setBannerMessage({
        type: 'success',
        text: res.mensaje || 'Reevaluación de métricas completada con éxito.',
      });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Error al recalcular las métricas del modelo.';
      setBannerMessage({
        type: 'danger',
        text: typeof msg === 'string' ? msg : JSON.stringify(msg),
      });
    },
  });

  const { data: modelo, isLoading: isModeloLoading, error: modeloError } = useQuery({
    queryKey: ['modelo-activa'],
    queryFn: modelsApi.getFichaModeloActivo,
  });

  const { data: monitoreo, isLoading: isMonitoreoLoading } = useQuery({
    queryKey: ['modelo-monitoreo'],
    queryFn: modelsApi.getMonitoreoModelo,
  });

  if (isModeloLoading || isMonitoreoLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400 gap-3">
        <Loader2 size={36} className="animate-spin text-brand-primary" />
        <span className="text-sm font-medium">Cargando ficha técnica del modelo...</span>
      </div>
    );
  }

  const is404 =
    (axios.isAxiosError(modeloError) && modeloError.response?.status === 404) ||
    (modeloError as any)?.response?.status === 404 ||
    (modeloError as any)?.status === 404;

  if (modeloError || !modelo) {
    if (is404) {
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

          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-6 rounded-xl flex items-start gap-3 shadow-sm">
            <AlertTriangle size={24} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-base text-amber-900">Ficha técnica del modelo</h2>
              <p className="text-sm mt-1 text-amber-800">
                No hay un modelo publicado actualmente
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-xl flex items-start gap-3">
        <AlertTriangle size={24} className="shrink-0 mt-0.5" />
        <div>
          <h2 className="font-bold text-base">Error al cargar la ficha del modelo</h2>
          <p className="text-sm mt-1 text-rose-600">
            No se pudo obtener la información del modelo activo desde la API. Verifique su conexión al servidor.
          </p>
        </div>
      </div>
    );
  }

  const mape14dVal = modelo.mape_14d !== null && modelo.mape_14d !== undefined ? modelo.mape_14d : null;
  const mapeDiarioVal = modelo.mape !== null && modelo.mape !== undefined ? modelo.mape : null;
  const hasMape14d = mape14dVal !== null;
  const mapeVal = hasMape14d ? mape14dVal : mapeDiarioVal;

  const wapeVal = modelo.wape !== null && modelo.wape !== undefined ? modelo.wape : null;
  const maeVal = modelo.mae !== null && modelo.mae !== undefined ? modelo.mae : null;
  const rmseVal = modelo.rmse !== null && modelo.rmse !== undefined ? modelo.rmse : null;
  const coberturaVal =
    modelo.cobertura_intervalo_95 !== null && modelo.cobertura_intervalo_95 !== undefined
      ? modelo.cobertura_intervalo_95
      : monitoreo?.cobertura_intervalo_95 !== null && monitoreo?.cobertura_intervalo_95 !== undefined
      ? monitoreo.cobertura_intervalo_95
      : null;
  const umbralMape =
    modelo.umbral_mape_max !== null && modelo.umbral_mape_max !== undefined
      ? modelo.umbral_mape_max
      : 15.0;

  const cumpleMape =
    mapeVal !== null && umbralMape !== null
      ? mapeVal <= umbralMape
      : modelo.cumple_meta !== undefined && modelo.cumple_meta !== null
      ? modelo.cumple_meta
      : null;

  const cortes = monitoreo?.serie_mensual || [];
  const totalCortes = cortes.length;
  const cortesSobreUmbral =
    umbralMape !== null
      ? cortes.filter((c) => {
          const m = c.mape_14d !== null && c.mape_14d !== undefined ? c.mape_14d : c.mape;
          return m !== null && m > umbralMape;
        }).length
      : 0;
  const mapesList = cortes
    .map((c) => (c.mape_14d !== null && c.mape_14d !== undefined ? c.mape_14d : c.mape))
    .filter((m): m is number => m !== null && m !== undefined && !isNaN(m));
  const avgMapeHistorico =
    mapesList.length > 0 ? mapesList.reduce((a, b) => a + b, 0) / mapesList.length : null;

  const variance =
    mapesList.length > 0 && avgMapeHistorico !== null
      ? mapesList.reduce((acc, val) => acc + Math.pow(val - avgMapeHistorico, 2), 0) /
        mapesList.length
      : null;
  const stdMape = variance !== null ? Math.sqrt(variance) : null;

  const alertaDegradacion =
    monitoreo?.alerta_degradacion !== undefined && monitoreo.alerta_degradacion !== null
      ? monitoreo.alerta_degradacion
      : cumpleMape !== null
      ? !cumpleMape
      : null;
  const estadoGeneral =
    alertaDegradacion === true
      ? 'En observación'
      : alertaDegradacion === false
      ? 'Bueno'
      : '—';

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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ficha técnica del modelo</h1>
          <p className="text-sm text-gray-500 mt-1">
            Revise los parámetros de arquitectura, precisión y umbrales de validación del modelo{' '}
            <span className="font-semibold text-gray-700">{modelo.algoritmo || 'XGBoost Regressor'}</span> vigente.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setBannerMessage(null);
              reevaluarMutation.mutate();
            }}
            disabled={reevaluarMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-sm cursor-pointer"
          >
            {reevaluarMutation.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Recalculando...</span>
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                <span>Recalcular métricas</span>
              </>
            )}
          </button>
        )}
      </div>

      {bannerMessage && (
        <AlertBanner
          type={bannerMessage.type}
          message={bannerMessage.text}
          onClose={() => setBannerMessage(null)}
        />
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6">
        <h2 className="text-base font-bold text-gray-900 mb-5">Identificación del modelo</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-gray-500 font-medium">Nombre comercial</div>
            <div className="text-lg font-bold text-gray-900 mt-1">
              RetailPro Forecast {formatModelVersion(modelo.version)}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{modelo.algoritmo}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500 font-medium">Versión vigente</div>
            <div className="text-lg font-bold text-gray-900 mt-1">
              {formatModelVersion(modelo.version)} (Producción)
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 font-medium">Último entrenamiento</div>
            <div className="text-lg font-bold text-gray-900 mt-1">
              {formatDateLima(modelo.fecha_entrenamiento)}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 font-medium">Estado de validación</div>
            <div className="mt-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                  alertaDegradacion === true
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : alertaDegradacion === false
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-gray-100 text-gray-700 border-gray-200'
                }`}
              >
                {estadoGeneral}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${hasMape14d ? 'lg:grid-cols-3 xl:grid-cols-6' : 'lg:grid-cols-5'} gap-4`}>

        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-5 flex flex-col justify-between"
          title="Error porcentual absoluto medio de la demanda acumulada a 14 días"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {hasMape14d ? 'MAPE (demanda 14 días)' : 'MAPE'}
              </span>
              {cumpleMape === true ? (
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
              ) : cumpleMape === false ? (
                <AlertTriangle size={18} className="text-rose-500 shrink-0" />
              ) : null}
            </div>
            <div
              className={`text-2xl font-extrabold mt-2 ${
                cumpleMape === true
                  ? 'text-emerald-600'
                  : cumpleMape === false
                  ? 'text-rose-600'
                  : 'text-gray-900'
              }`}
            >
              {mapeVal !== null ? formatPct(mapeVal, 2) : '—'}
            </div>
          </div>
          <p className="text-xs mt-2 font-medium">
            {mapeVal !== null && umbralMape !== null ? (
              cumpleMape ? (
                <span className="text-gray-500">
                  Bajo umbral de {formatPct(umbralMape, 2)}
                </span>
              ) : (
                <span className="text-rose-600 font-semibold">
                  Supera umbral de {formatPct(umbralMape, 2)}
                </span>
              )
            ) : (
              <span className="text-gray-400">Sin evaluación</span>
            )}
          </p>
        </div>

        {hasMape14d && (
          <div
            className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-5 flex flex-col justify-between"
            title="Error porcentual absoluto medio diario complementario"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  MAPE diario (complementario)
                </span>
              </div>
              <div className="text-2xl font-extrabold text-gray-900 mt-2">
                {mapeDiarioVal !== null ? formatPct(mapeDiarioVal, 2) : '—'}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Seguimiento complementario</p>
          </div>
        )}

        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-5 flex flex-col justify-between"
          title="Error porcentual absoluto ponderado: error total dividido entre el volumen total de ventas reales"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                WAPE
              </span>
            </div>
            <div className="text-2xl font-extrabold text-gray-900 mt-2">
              {wapeVal !== null ? formatPct(wapeVal, 2) : '—'}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Ponderado por volumen</p>
        </div>

        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-5 flex flex-col justify-between"
          title="Error absoluto medio: promedio de desviaciones en unidades físicas"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                MAE
              </span>
            </div>
            <div className="text-2xl font-extrabold text-gray-900 mt-2">
              {maeVal !== null ? `${maeVal.toFixed(2)} u.` : '—'}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Desviación media (unidades)</p>
        </div>

        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-5 flex flex-col justify-between"
          title="Raíz del error cuadrático medio: penaliza con mayor peso los errores grandes en la proyección"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                RMSE
              </span>
            </div>
            <div className="text-2xl font-extrabold text-gray-900 mt-2">
              {rmseVal !== null ? `${rmseVal.toFixed(2)} u.` : '—'}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Penaliza desviaciones altas</p>
        </div>

        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-5 flex flex-col justify-between"
          title="Cobertura IC 95%: porcentaje de observaciones reales que cayeron dentro del intervalo de confianza proyectado al 95%"
        >
          <div>
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate"
                title="Cobertura IC 95 % (validación secuencial)"
              >
                Cobertura IC 95 %
              </span>
            </div>
            <div className="text-2xl font-extrabold text-gray-900 mt-2">
              {coberturaVal !== null ? formatPct(coberturaVal, 2) : '—'}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 truncate" title="Validación secuencial">
            Validación secuencial
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-3">Resumen de rendimiento</h2>
            <div className="text-sm font-semibold text-gray-800 mb-2">
              Estado general:{' '}
              <span
                className={
                  alertaDegradacion === true
                    ? 'text-amber-600 font-bold'
                    : alertaDegradacion === false
                    ? 'text-emerald-600 font-bold'
                    : 'text-gray-600 font-bold'
                }
              >
                {estadoGeneral}
              </span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              El modelo presenta un MAPE (demanda 14 días) de{' '}
              <strong className="text-gray-900">
                {mapeVal !== null ? formatPct(mapeVal, 2) : '—'}
              </strong>
              , el cual{' '}
              {cumpleMape === true ? (
                'se encuentra dentro del límite admitido.'
              ) : cumpleMape === false ? (
                <>
                  supera el umbral máximo tolerado de{' '}
                  <strong className="text-rose-600">
                    {umbralMape !== null ? formatPct(umbralMape, 2) : '—'}
                  </strong>
                  .
                </>
              ) : (
                'no cuenta con evaluación suficiente.'
              )}{' '}
              En la evaluación de backtesting continuo,{' '}
              <strong className="text-gray-900">
                {cortesSobreUmbral} de {totalCortes} cortes
              </strong>{' '}
              mensuales sobrepasan la meta admisible (MAPE promedio histórico:{' '}
              {avgMapeHistorico !== null ? formatPct(avgMapeHistorico, 2) : '—'}),{' '}
              {alertaDegradacion === true
                ? 'activando el protocolo de alerta de degradación y sugiriendo la calibración de hiperparámetros o ingesta de nuevos datos históricos.'
                : 'manteniendo el desempeño dentro de los parámetros esperados.'}
            </p>
          </div>

          <div className="pt-6 border-t border-gray-100 mt-6 text-xs text-gray-400">
            Fecha de última evaluación: {formatDateLima(modelo.fecha_entrenamiento)}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Umbral de precisión y reglas</h2>

          <div className="space-y-3">

            <div className="flex items-center justify-between p-3.5 rounded-lg border border-gray-200/90 bg-gray-50/50">
              <div>
                <div className="text-sm font-semibold text-gray-900">Umbral de precisión</div>
                <div className="text-xs text-gray-500 mt-0.5">Meta de error admitido</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-800">
                  {umbralMape !== null ? `MAPE < ${formatPct(umbralMape, 2)}` : '—'}
                </span>
                {cumpleMape !== null && (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      cumpleMape
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-rose-100 text-rose-700 border-rose-200'
                    }`}
                  >
                    {cumpleMape ? 'Cumple' : 'No cumple'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-lg border border-gray-200/90 bg-gray-50/50">
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  Cobertura IC 95 % (validación secuencial)
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Intervalo predictivo empírico fuera de muestra
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-800">
                  {coberturaVal !== null ? formatPct(coberturaVal, 2) : '—'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-lg border border-gray-200/90 bg-gray-50/50">
              <div>
                <div className="text-sm font-semibold text-gray-900">Dispersión inter-cortes</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Variabilidad de error en backtesting
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-800">
                  {stdMape !== null ? `σ = ${stdMape.toFixed(2)}%` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
