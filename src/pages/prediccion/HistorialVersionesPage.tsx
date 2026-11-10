import React, { useState, useMemo, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modelsApi } from '@/api/models';
import { forecastsApi, PronosticoSkuDetalle } from '@/api/forecasts';
import { useAuth } from '@/auth/useAuth';
import { formatDateLima, formatPct, formatModelVersion } from '@/lib/formatters';
import { formatFeatureLabel } from '@/lib/dictionaries';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';

interface FactorSHAPDivergente {
  featureKey: string;
  label: string;
  impacto: number;
}

export const HistorialVersionesPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.rol === 'administrador';

  const [selectedSku, setSelectedSku] = useState<string>('ABA-001');
  const [selectedCompareSku, setSelectedCompareSku] = useState<string>('');
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);

  const {
    data: historial,
    isLoading: isHistorialLoading,
    error: historialError,
  } = useQuery({
    queryKey: ['modelos-historial'],
    queryFn: modelsApi.listHistorialModelos,
  });

  const { data: pronosticosList } = useQuery({
    queryKey: ['pronosticos-skus'],
    queryFn: () => forecastsApi.listPronosticos(),
  });

  useEffect(() => {
    if (pronosticosList?.items && pronosticosList.items.length > 0) {
      if (!selectedSku) {
        setSelectedSku(pronosticosList.items[0].sku);
      }
      if (!selectedCompareSku) {
        const other = pronosticosList.items.find(
          (i) => i.sku !== (selectedSku || pronosticosList.items[0].sku)
        );
        if (other) {
          setSelectedCompareSku(other.sku);
        }
      }
    }
  }, [pronosticosList, selectedSku, selectedCompareSku]);

  const { data: skuDetalle, isLoading: isSkuLoading } = useQuery({
    queryKey: ['pronostico-sku-shap', selectedSku],
    queryFn: () => forecastsApi.getForecastBySku(selectedSku),
    enabled: !!selectedSku,
  });

  const { data: compareSkuDetalle, isLoading: isCompareSkuLoading } = useQuery({
    queryKey: ['pronostico-sku-shap-compare', selectedCompareSku],
    queryFn: () => forecastsApi.getForecastBySku(selectedCompareSku),
    enabled: isComparing && !!selectedCompareSku,
  });

  const activarMutation = useMutation({
    mutationFn: (idModelo: number) => modelsApi.activarVersionModelo(idModelo),
    onSuccess: (data) => {
      setActivationError(null);
      setActivationSuccess(data.mensaje || 'Versión activada exitosamente en producción.');
      queryClient.invalidateQueries({ queryKey: ['modelos-historial'] });
      queryClient.invalidateQueries({ queryKey: ['modelo-activa'] });
      setTimeout(() => setActivationSuccess(null), 5000);
    },
    onError: (err: any) => {
      setActivationSuccess(null);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.mensaje ||
        'Error al activar la versión del modelo.';
      setActivationError(msg);
      setTimeout(() => setActivationError(null), 6000);
    },
  });

  const computeFactores = (detalle?: PronosticoSkuDetalle): FactorSHAPDivergente[] => {
    if (!detalle?.serie_14_dias || detalle.serie_14_dias.length === 0) {
      return [];
    }

    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};

    detalle.serie_14_dias.forEach((dia) => {
      const shap = dia.explicacion_shap as
        | { top_factores?: Array<{ feature: string; impacto: number }> }
        | undefined;
      const topFactores = shap?.top_factores;

      if (Array.isArray(topFactores)) {
        topFactores.forEach((f) => {
          if (f.feature && typeof f.impacto === 'number' && !isNaN(f.impacto)) {
            sums[f.feature] = (sums[f.feature] || 0) + f.impacto;
            counts[f.feature] = (counts[f.feature] || 0) + 1;
          }
        });
      }
    });

    const features = Object.keys(sums);
    if (features.length === 0) {
      return [];
    }

    const items = features.map((key) => {
      const avg = sums[key] / counts[key];
      return {
        featureKey: key,
        label: formatFeatureLabel(key),
        impacto: Number(avg.toFixed(3)),
      };
    });

    items.sort((a, b) => Math.abs(b.impacto) - Math.abs(a.impacto));
    return items;
  };

  const factoresDivergentes = useMemo<FactorSHAPDivergente[]>(() => {
    return computeFactores(skuDetalle);
  }, [skuDetalle]);

  const factoresCompareDivergentes = useMemo<FactorSHAPDivergente[]>(() => {
    return computeFactores(compareSkuDetalle);
  }, [compareSkuDetalle]);

  const maxAbsImpacto = useMemo(() => {
    if (factoresDivergentes.length === 0) return 1;
    const maxVal = Math.max(...factoresDivergentes.map((f) => Math.abs(f.impacto)));
    return maxVal > 0 ? maxVal : 1;
  }, [factoresDivergentes]);

  const maxAbsCompareImpacto = useMemo(() => {
    if (factoresCompareDivergentes.length === 0) return 1;
    const maxVal = Math.max(...factoresCompareDivergentes.map((f) => Math.abs(f.impacto)));
    return maxVal > 0 ? maxVal : 1;
  }, [factoresCompareDivergentes]);

  const degradacionesMap = useMemo(() => {
    const map = new Map<
      number,
      { actual: number | string; anterior: number | string; versionAnterior: string }
    >();
    if (!historial || historial.length <= 1) return map;

    for (let i = 0; i < historial.length; i++) {
      const actual = historial[i];
      let anterior: (typeof actual) | undefined = undefined;

      for (let j = i + 1; j < historial.length; j++) {
        const candidate = historial[j];
        if (candidate.estado?.toUpperCase() !== 'DESCARTADA') {
          anterior = candidate;
          break;
        }
      }

      if (
        anterior &&
        actual.mape !== null &&
        actual.mape !== undefined &&
        anterior.mape !== null &&
        anterior.mape !== undefined &&
        actual.mape > anterior.mape
      ) {
        map.set(actual.id_modelo, {
          actual: actual.mape,
          anterior: anterior.mape,
          versionAnterior: anterior.version,
        });
      }
    }

    return map;
  }, [historial]);

  const renderShapChart = (
    factores: FactorSHAPDivergente[],
    maxAbs: number,
    loading: boolean,
    title?: string
  ) => {
    return (
      <div className="space-y-4">
        {title && (
          <h3 className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-2">
            {title}
          </h3>
        )}

        <div className="flex items-center justify-between text-[10px] font-semibold text-gray-400 pb-2 border-b border-gray-100 mb-4">
          <span className="text-rose-600 font-medium">← Reduce demanda diaria</span>
          <span className="text-gray-500">0.0 u.</span>
          <span className="text-blue-600 font-medium">Incrementa demanda diaria →</span>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center text-gray-400 gap-2">
              <Loader2 size={24} className="animate-spin text-brand-primary" />
              <span className="text-xs">Calculando valores SHAP del SKU...</span>
            </div>
          ) : factores.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500">
              No hay factores SHAP registrados para el SKU seleccionado.
            </div>
          ) : (
            factores.map((factor) => {
              const isPositive = factor.impacto >= 0;
              const absVal = Math.abs(factor.impacto);
              const barWidthPct = Math.min(50, Math.max(2, (absVal / maxAbs) * 50));
              const signPrefix = factor.impacto > 0 ? '+' : '';

              return (
                <div key={factor.featureKey} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                    <span>{factor.label}</span>
                    <span
                      className={`tabular-nums text-xs font-bold ${
                        isPositive ? 'text-blue-600' : 'text-rose-600'
                      }`}
                    >
                      {signPrefix}
                      {factor.impacto.toFixed(2)} u.
                    </span>
                  </div>

                  <div className="w-full h-3 bg-gray-100 rounded relative overflow-hidden flex items-center">
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-300 z-10"></div>

                    {isPositive && (
                      <div
                        className="absolute left-1/2 top-0 bottom-0 bg-blue-600 rounded-r transition-all duration-500 ease-out"
                        style={{ width: `${barWidthPct}%` }}
                      />
                    )}

                    {!isPositive && (
                      <div
                        className="absolute right-1/2 top-0 bottom-0 bg-rose-500 rounded-l transition-all duration-500 ease-out"
                        style={{ width: `${barWidthPct}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

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
          Historial de versiones y explicabilidad (SHAP)
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Explore el historial de versiones del modelo XGBoost en producción y la contribución
          de variables clave.
        </p>
      </div>

      {activationSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{activationSuccess}</span>
          </div>
          <button
            onClick={() => setActivationSuccess(null)}
            className="text-emerald-600 hover:text-emerald-800 font-medium text-xs"
          >
            Cerrar
          </button>
        </div>
      )}

      {activationError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-rose-600" />
            <span>{activationError}</span>
          </div>
          <button
            onClick={() => setActivationError(null)}
            className="text-rose-600 hover:text-rose-800 font-medium text-xs"
          >
            Cerrar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`space-y-4 ${isComparing ? 'lg:col-span-12' : 'lg:col-span-7'}`}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Historial de Modelos</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Versiones entrenadas, métricas históricas de error y estado del modelo.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200/80 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Versión</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">MAPE</th>
                    <th className="py-3 px-4">WAPE</th>
                    <th className="py-3 px-4">MAE</th>
                    <th className="py-3 px-4">RMSE</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isHistorialLoading ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="py-4 px-4">
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 bg-gray-200 rounded w-12"></div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 bg-gray-200 rounded w-12"></div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 bg-gray-200 rounded w-12"></div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 bg-gray-200 rounded w-12"></div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="h-6 bg-gray-200 rounded w-14 ml-auto"></div>
                        </td>
                      </tr>
                    ))
                  ) : historialError ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-rose-600 text-sm">
                        Error al cargar el historial de versiones del modelo.
                      </td>
                    </tr>
                  ) : historial && historial.length > 0 ? (
                    historial.map((v) => {
                      const isActiva =
                        v.estado.toUpperCase() === 'ACTIVA' || v.estado === 'Activa';
                      const isDescartada =
                        v.estado.toUpperCase() === 'DESCARTADA' || v.estado === 'Descartada';
                      const degradacion = degradacionesMap.get(v.id_modelo);
                      const tieneDegradacion = !!degradacion;

                      return (
                        <tr
                          key={v.id_modelo}
                          className={`transition-colors ${
                            tieneDegradacion
                              ? 'bg-rose-50 hover:bg-rose-100/70'
                              : 'hover:bg-gray-50/60'
                          }`}
                        >
                          <td className="py-4 px-4 font-bold text-gray-900">
                            {formatModelVersion(v.version)}
                          </td>
                          <td className="py-4 px-4 text-gray-600 text-xs">
                            {formatDateLima(v.fecha_entrenamiento)}
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                isActiva
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : isDescartada
                                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                  : 'bg-gray-100 text-gray-700 border border-gray-200'
                              }`}
                            >
                              {isActiva ? 'Activa' : isDescartada ? 'Descartada' : 'Anterior'}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-bold tabular-nums text-gray-900">
                            <div>{v.mape !== null && v.mape !== undefined ? formatPct(v.mape, 2) : '—'}</div>
                            {tieneDegradacion && degradacion && (
                              <div className="mt-1">
                                <Badge
                                  variant="danger"
                                  title={`MAPE ${degradacion.actual}% vs ${degradacion.anterior}% de la versión ${degradacion.versionAnterior}`}
                                >
                                  Degradación de desempeño detectada
                                </Badge>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 font-bold tabular-nums text-gray-900">
                            {v.wape !== null && v.wape !== undefined ? formatPct(v.wape, 2) : '—'}
                          </td>
                          <td className="py-4 px-4 text-gray-600 tabular-nums">
                            {v.mae !== null && v.mae !== undefined ? v.mae.toFixed(2) : '—'}
                          </td>
                          <td className="py-4 px-4 text-gray-600 tabular-nums">
                            {v.rmse !== null && v.rmse !== undefined ? v.rmse.toFixed(2) : '—'}
                          </td>
                          <td className="py-4 px-4 text-right">
                            {isActiva ? (
                              <span className="text-xs text-emerald-600 font-semibold">
                                En uso
                              </span>
                            ) : isAdmin ? (
                              <button
                                type="button"
                                onClick={() => activarMutation.mutate(v.id_modelo)}
                                disabled={activarMutation.isPending}
                                className="px-2.5 py-1 text-xs font-semibold text-brand-primary hover:text-brand-primary-hover hover:bg-emerald-50 rounded border border-brand-primary/30 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                Activar
                              </button>
                            ) : (
                              <span
                                className="text-xs text-gray-400 italic cursor-not-allowed"
                                title="Solo el Administrador puede activar versiones de modelo en producción"
                              >
                                Solo admin
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500 text-sm">
                        No hay versiones registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div
          className={`bg-white rounded-xl shadow-sm border border-gray-200/80 p-6 flex flex-col justify-between ${
            isComparing ? 'lg:col-span-12' : 'lg:col-span-5'
          }`}
        >
          <div>
            {!isComparing ? (
              <div className="flex flex-col gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 leading-snug">
                    Contribución promedio al pronóstico diario (unidades)
                  </h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Valores SHAP: cuantifican el impacto de cada variable en la proyección del SKU.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <div className="w-32">
                    <select
                      value={selectedSku}
                      onChange={(e) => setSelectedSku(e.target.value)}
                      className="w-full px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
                    >
                      {pronosticosList?.items && pronosticosList.items.length > 0 ? (
                        pronosticosList.items.map((item) => (
                          <option key={item.sku} value={item.sku}>
                            {item.sku}
                          </option>
                        ))
                      ) : (
                        <option value="">Cargando catálogo...</option>
                      )}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500 whitespace-nowrap">Comparar con:</span>
                    <select
                      value={selectedCompareSku}
                      onChange={(e) => setSelectedCompareSku(e.target.value)}
                      className="w-32 px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
                    >
                      <option value="">Seleccionar SKU</option>
                      {pronosticosList?.items?.map((item) => (
                        <option key={item.sku} value={item.sku}>
                          {item.sku}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsComparing(true)}
                    disabled={!selectedSku || !selectedCompareSku || selectedSku === selectedCompareSku}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Comparar explicaciones
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-gray-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 leading-snug">
                    Comparación de explicaciones SHAP
                  </h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Valores SHAP: cuantifican el impacto de cada variable en la proyección de cada SKU.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsComparing(false)}
                  className="px-3 py-1.5 border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
                >
                  Cerrar comparación
                </button>
              </div>
            )}

            {!isComparing ? (
              renderShapChart(factoresDivergentes, maxAbsImpacto, isSkuLoading)
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/60">
                  {renderShapChart(
                    factoresDivergentes,
                    maxAbsImpacto,
                    isSkuLoading,
                    `${skuDetalle?.sku || selectedSku} - ${skuDetalle?.nombre_producto || 'Producto'}`
                  )}
                </div>
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/60">
                  {renderShapChart(
                    factoresCompareDivergentes,
                    maxAbsCompareImpacto,
                    isCompareSkuLoading,
                    `${compareSkuDetalle?.sku || selectedCompareSku} - ${compareSkuDetalle?.nombre_producto || 'Producto'}`
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 bg-gray-50 border border-gray-200/80 rounded-xl p-3.5 text-xs text-gray-600 leading-relaxed">
            <div className="flex items-start gap-2">
              <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <span>
                Cada barra indica cuánto sube o baja esa variable el pronóstico diario del
                producto (valores SHAP promedio de los 14 días).
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
