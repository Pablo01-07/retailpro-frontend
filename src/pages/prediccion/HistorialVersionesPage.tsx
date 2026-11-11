import React, { useState, useMemo, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modelsApi } from '@/api/models';
import { forecastsApi, PronosticoSkuDetalle } from '@/api/forecasts';
import { useAuth } from '@/auth/useAuth';
import { formatDateLima, formatPct, formatModelVersion } from '@/lib/formatters';
import { formatFeatureLabel } from '@/lib/dictionaries';
import { AlertBanner } from '@/components/common/AlertBanner';
import { Badge } from '@/components/common/Badge';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  GitCompare,
  X,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';

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

  const [comparingModeloId, setComparingModeloId] = useState<number | null>(null);
  const [descartarComentario, setDescartarComentario] = useState<string>('');
  const [showDescartarInput, setShowDescartarInput] = useState<boolean>(false);
  const [entrenarMsg, setEntrenarMsg] = useState<{
    type: 'success' | 'danger';
    text: string;
  } | null>(null);

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

  const entrenarMutation = useMutation({
    mutationFn: () => modelsApi.triggerReentrenamiento('reentrenamiento_manual'),
    onSuccess: (data) => {
      setEntrenarMsg({
        type: 'success',
        text:
          data.mensaje ||
          'Reentrenamiento iniciado. El resultado aparecerá en el historial de versiones.',
      });
      queryClient.invalidateQueries({ queryKey: ['modelos-historial'] });
      queryClient.invalidateQueries({ queryKey: ['notificaciones-modelos'] });
      queryClient.invalidateQueries({ queryKey: ['notificaciones-cargas'] });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.mensaje ||
        'Error al solicitar el entrenamiento del nuevo modelo.';
      setEntrenarMsg({
        type: 'danger',
        text: msg,
      });
    },
  });

  const {
    data: comparacion,
    isLoading: isComparacionLoading,
    error: comparacionError,
  } = useQuery({
    queryKey: ['modelo-comparacion', comparingModeloId],
    queryFn: () => modelsApi.getComparacionModelo(comparingModeloId!),
    enabled: comparingModeloId !== null,
  });

  const effectiveUmbral =
    comparacion?.umbral_mape_evaluacion !== null &&
    comparacion?.umbral_mape_evaluacion !== undefined
      ? comparacion.umbral_mape_evaluacion
      : (comparacion?.umbral_mape ?? 15);

  const publicarMutation = useMutation({
    mutationFn: (id: number) => modelsApi.publicarModelo(id),
    onSuccess: (data) => {
      setActivationSuccess(data.mensaje || 'Modelo publicado exitosamente en producción.');
      setActivationError(null);
      setComparingModeloId(null);
      setShowDescartarInput(false);
      setDescartarComentario('');
      queryClient.invalidateQueries({ queryKey: ['modelos-historial'] });
      queryClient.invalidateQueries({ queryKey: ['modelo-activa'] });
      queryClient.invalidateQueries({ queryKey: ['modelo-monitoreo'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-resumen'] });
      queryClient.invalidateQueries({ queryKey: ['notificaciones-modelos'] });
      queryClient.invalidateQueries({ queryKey: ['notificaciones-cargas'] });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.mensaje ||
        'Error al publicar el modelo candidato.';
      setActivationError(msg);
      setActivationSuccess(null);
    },
  });

  const descartarMutation = useMutation({
    mutationFn: ({ id, comentario }: { id: number; comentario: string }) =>
      modelsApi.descartarModelo(id, comentario),
    onSuccess: (data) => {
      setActivationSuccess(data.mensaje || 'Modelo descartado exitosamente.');
      setActivationError(null);
      setComparingModeloId(null);
      setShowDescartarInput(false);
      setDescartarComentario('');
      queryClient.invalidateQueries({ queryKey: ['modelos-historial'] });
      queryClient.invalidateQueries({ queryKey: ['modelo-activa'] });
      queryClient.invalidateQueries({ queryKey: ['modelo-monitoreo'] });
      queryClient.invalidateQueries({ queryKey: ['notificaciones-modelos'] });
      queryClient.invalidateQueries({ queryKey: ['notificaciones-cargas'] });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.mensaje ||
        'Error al descartar el modelo.';
      setActivationError(msg);
      setActivationSuccess(null);
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
      { actual: number | string; anterior: number | string; versionAnterior: string; es14d?: boolean }
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

      if (anterior) {
        const hasBoth14d =
          actual.mape_14d !== null &&
          actual.mape_14d !== undefined &&
          anterior.mape_14d !== null &&
          anterior.mape_14d !== undefined;

        const valActual = hasBoth14d
          ? actual.mape_14d
          : actual.mape !== null && actual.mape !== undefined
          ? actual.mape
          : null;

        const valAnterior = hasBoth14d
          ? anterior.mape_14d
          : anterior.mape !== null && anterior.mape !== undefined
          ? anterior.mape
          : null;

        if (
          valActual !== null &&
          valActual !== undefined &&
          valAnterior !== null &&
          valAnterior !== undefined &&
          valActual > valAnterior
        ) {
          map.set(actual.id_modelo, {
            actual: valActual,
            anterior: valAnterior,
            versionAnterior: anterior.version,
            es14d: hasBoth14d,
          });
        }
      }
    }

    return map;
  }, [historial]);

  const renderMetricDiff = (
    diff: number | null | undefined,
    unit: string = '%',
    isCoverage: boolean = false
  ) => {
    if (diff === null || diff === undefined) {
      return <span className="text-gray-400">—</span>;
    }
    if (diff === 0) {
      return <span className="text-gray-500 font-semibold">0.00{unit}</span>;
    }
    if (isCoverage) {
      const isBetter = diff > 0;
      return (
        <span
          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold text-xs ${
            isBetter ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
          }`}
        >
          {isBetter ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
          {unit}
        </span>
      );
    }
    const isBetter = diff < 0;
    return (
      <span
        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold text-xs ${
          isBetter ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
        }`}
      >
        {isBetter ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
        {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
        {unit}
      </span>
    );
  };

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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Historial de versiones y explicabilidad (SHAP)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Explore el historial de versiones del modelo XGBoost en producción y la contribución
            de variables clave.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => entrenarMutation.mutate()}
            disabled={entrenarMutation.isPending}
            className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 self-start sm:self-auto shrink-0"
          >
            {entrenarMutation.isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Sparkles size={15} />
            )}
            <span>Entrenar nuevo modelo</span>
          </button>
        )}
      </div>

      {entrenarMsg && (
        <AlertBanner
          type={entrenarMsg.type}
          message={entrenarMsg.text}
          onClose={() => setEntrenarMsg(null)}
        />
      )}

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
                    <th className="py-3 px-4">MAPE 14 días</th>
                    <th className="py-3 px-4">MAPE diario</th>
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
                      <td colSpan={9} className="py-8 text-center text-rose-600 text-sm">
                        Error al cargar el historial de versiones del modelo.
                      </td>
                    </tr>
                  ) : historial && historial.length > 0 ? (
                    historial.map((v) => {
                      const estadoNorm = (v.estado || '').toUpperCase();
                      let badgeColor = 'bg-gray-100 text-gray-700 border-gray-200';
                      let badgeText = 'Anterior';

                      if (estadoNorm === 'ACTIVA') {
                        badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                        badgeText = 'Activa';
                      } else if (estadoNorm === 'APTA') {
                        badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
                        badgeText = 'Apta - pendiente de publicación';
                      } else if (estadoNorm === 'DESCARTADA') {
                        badgeColor = 'bg-rose-100 text-rose-700 border-rose-200';
                        badgeText = 'Descartada';
                      } else if (estadoNorm === 'CANDIDATA') {
                        badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
                        badgeText = 'En evaluación';
                      } else if (estadoNorm === 'ANTERIOR') {
                        badgeColor = 'bg-gray-100 text-gray-700 border-gray-200';
                        badgeText = 'Anterior';
                      }

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
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeColor}`}
                            >
                              {badgeText}
                            </span>
                            {v.observacion && (
                              <span
                                className="block text-[11px] text-gray-500 mt-1 max-w-[200px] truncate"
                                title={v.observacion}
                              >
                                {v.observacion}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 font-bold tabular-nums text-gray-900">
                            <div>
                              {v.mape_14d !== null && v.mape_14d !== undefined
                                ? formatPct(v.mape_14d, 2)
                                : '—'}
                            </div>
                            {tieneDegradacion && degradacion && (
                              <div className="mt-1">
                                <Badge
                                  variant="danger"
                                  title={`${degradacion.es14d ? 'MAPE 14d' : 'MAPE'} ${degradacion.actual}% vs ${degradacion.anterior}% de la versión ${degradacion.versionAnterior}`}
                                >
                                  Degradación de desempeño detectada
                                </Badge>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 tabular-nums text-gray-700">
                            <div>{v.mape !== null && v.mape !== undefined ? formatPct(v.mape, 2) : '—'}</div>
                          </td>
                          <td className="py-4 px-4 font-bold tabular-nums text-gray-900">
                            {v.wape !== null && v.wape !== undefined && !isNaN(Number(v.wape)) ? formatPct(Number(v.wape), 2) : '—'}
                          </td>
                          <td className="py-4 px-4 text-gray-600 tabular-nums">
                            {v.mae !== null && v.mae !== undefined ? v.mae.toFixed(2) : '—'}
                          </td>
                          <td className="py-4 px-4 text-gray-600 tabular-nums">
                            {v.rmse !== null && v.rmse !== undefined ? v.rmse.toFixed(2) : '—'}
                          </td>
                          <td className="py-4 px-4 text-right">
                            {estadoNorm === 'ACTIVA' ? (
                              <span className="text-xs text-emerald-600 font-semibold">
                                En uso
                              </span>
                            ) : estadoNorm === 'APTA' || estadoNorm === 'DESCARTADA' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setComparingModeloId(v.id_modelo);
                                  setShowDescartarInput(false);
                                  setDescartarComentario('');
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100/80 rounded border border-blue-200 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <GitCompare size={13} />
                                <span>Comparar</span>
                              </button>
                            ) : estadoNorm === 'ANTERIOR' ? (
                              isAdmin ? (
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
                              )
                            ) : (
                              <span className="text-xs text-amber-600 font-medium">
                                En evaluación
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

      {comparingModeloId !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-gray-100 space-y-6 my-8 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <GitCompare size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Comparación con el modelo en producción
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {comparacion
                      ? `Candidato ${comparacion.version_candidato} vs Vigente ${comparacion.version_activa || 'No disponible'}`
                      : 'Evaluación de métricas'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setComparingModeloId(null);
                  setShowDescartarInput(false);
                }}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {isComparacionLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-3">
                <Loader2 size={32} className="animate-spin text-brand-700" />
                <span className="text-xs font-medium">
                  Cargando comparación de métricas con el modelo vigente...
                </span>
              </div>
            ) : comparacionError || !comparacion ? (
              <AlertBanner
                type="danger"
                message="No se pudo obtener la comparación del modelo seleccionado. Intente nuevamente."
              />
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      comparacion.candidato.estado === 'APTA'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-rose-100 text-rose-700 border border-rose-200'
                    }`}
                  >
                    Estado candidato: {comparacion.candidato.estado === 'APTA' ? 'Apta' : 'Descartada'}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      comparacion.cumple_umbral
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {comparacion.cumple_umbral ? (
                      <CheckCircle2 size={14} className="text-emerald-700" />
                    ) : (
                      <AlertTriangle size={14} className="text-rose-700" />
                    )}
                    {comparacion.cumple_umbral
                      ? `Cumple umbral (≤ ${effectiveUmbral}%)`
                      : `Supera umbral (> ${effectiveUmbral}%)`}
                  </span>

                  {comparacion.comparacion_vigente === 'mejora' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <TrendingDown size={14} className="text-emerald-700" />
                      Mejora al modelo vigente
                    </span>
                  ) : comparacion.comparacion_vigente === 'equivalente' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                      <CheckCircle2 size={14} className="text-gray-500" />
                      Desempeño equivalente al vigente
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                      <AlertTriangle size={14} className="text-amber-700" />
                      No supera al modelo vigente
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto border border-gray-200/80 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Métrica</th>
                        <th className="py-3 px-4">Candidato ({comparacion.version_candidato})</th>
                        <th className="py-3 px-4">Vigente ({comparacion.version_activa || 'Producción'})</th>
                        <th className="py-3 px-4 text-right">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-3 px-4 font-bold text-gray-900">
                          MAPE (demanda 14 días)
                        </td>
                        <td className="py-3 px-4 font-bold text-blue-700 tabular-nums">
                          {comparacion.candidato.mape_14d !== null && comparacion.candidato.mape_14d !== undefined
                            ? formatPct(comparacion.candidato.mape_14d, 2)
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-gray-700 tabular-nums">
                          {comparacion.activa?.mape_14d !== null && comparacion.activa?.mape_14d !== undefined
                            ? formatPct(comparacion.activa.mape_14d, 2)
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          {renderMetricDiff(comparacion.diferencia.mape_14d, '%', false)}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-3 px-4 font-medium text-gray-800">
                          MAPE diario (complementario)
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-900 tabular-nums">
                          {comparacion.candidato.mape !== null && comparacion.candidato.mape !== undefined
                            ? formatPct(comparacion.candidato.mape, 2)
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-gray-700 tabular-nums">
                          {comparacion.activa?.mape !== null && comparacion.activa?.mape !== undefined
                            ? formatPct(comparacion.activa.mape, 2)
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          {renderMetricDiff(comparacion.diferencia.mape, '%', false)}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-3 px-4 font-medium text-gray-800">MAE</td>
                        <td className="py-3 px-4 font-semibold text-gray-900 tabular-nums">
                          {comparacion.candidato.mae !== null && comparacion.candidato.mae !== undefined
                            ? `${comparacion.candidato.mae.toFixed(2)} u.`
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-gray-700 tabular-nums">
                          {comparacion.activa?.mae !== null && comparacion.activa?.mae !== undefined
                            ? `${comparacion.activa.mae.toFixed(2)} u.`
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          {renderMetricDiff(comparacion.diferencia.mae, ' u.', false)}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-3 px-4 font-medium text-gray-800">RMSE</td>
                        <td className="py-3 px-4 font-semibold text-gray-900 tabular-nums">
                          {comparacion.candidato.rmse !== null && comparacion.candidato.rmse !== undefined
                            ? `${comparacion.candidato.rmse.toFixed(2)} u.`
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-gray-700 tabular-nums">
                          {comparacion.activa?.rmse !== null && comparacion.activa?.rmse !== undefined
                            ? `${comparacion.activa.rmse.toFixed(2)} u.`
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          {renderMetricDiff(comparacion.diferencia.rmse, ' u.', false)}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-3 px-4 font-medium text-gray-800">WAPE</td>
                        <td className="py-3 px-4 font-semibold text-gray-900 tabular-nums">
                          {comparacion.candidato.wape !== null && comparacion.candidato.wape !== undefined
                            ? formatPct(comparacion.candidato.wape, 2)
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-gray-700 tabular-nums">
                          {comparacion.activa?.wape !== null && comparacion.activa?.wape !== undefined
                            ? formatPct(comparacion.activa.wape, 2)
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          {renderMetricDiff(comparacion.diferencia.wape, '%', false)}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-3 px-4 font-medium text-gray-800">Cobertura IC 95%</td>
                        <td className="py-3 px-4 font-semibold text-gray-900 tabular-nums">
                          {comparacion.candidato.cobertura_intervalo_95 !== null && comparacion.candidato.cobertura_intervalo_95 !== undefined
                            ? formatPct(comparacion.candidato.cobertura_intervalo_95, 2)
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-gray-700 tabular-nums">
                          {comparacion.activa?.cobertura_intervalo_95 !== null && comparacion.activa?.cobertura_intervalo_95 !== undefined
                            ? formatPct(comparacion.activa.cobertura_intervalo_95, 2)
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          {renderMetricDiff(comparacion.diferencia.cobertura_intervalo_95, '%', true)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-200/70 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-900">
                    <span>Evolución de MAPE (demanda 14 días) por corte</span>
                    <span className="text-[11px] font-normal text-gray-500">
                      Umbral de rechazo: {effectiveUmbral}%
                    </span>
                  </div>

                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={comparacion.cortes.map((c) => ({
                          periodo: c.periodo,
                          candidato:
                            c.mape_14d_candidato !== null && c.mape_14d_candidato !== undefined
                              ? Number(c.mape_14d_candidato.toFixed(2))
                              : null,
                          activa:
                            c.mape_14d_activa !== null && c.mape_14d_activa !== undefined
                              ? Number(c.mape_14d_activa.toFixed(2))
                              : null,
                        }))}
                        margin={{ top: 10, right: 35, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="periodo"
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
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => `${val}%`}
                          domain={[0, Math.max(20, Math.ceil(effectiveUmbral + 5))]}
                        />
                        <Tooltip
                          formatter={(val: any) =>
                            val !== null && val !== undefined ? `${Number(val).toFixed(2)}%` : '—'
                          }
                        />
                        <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '11px' }} />
                        <ReferenceLine
                          y={effectiveUmbral}
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={{
                            value: `${effectiveUmbral}% Umbral máx`,
                            position: 'right',
                            fill: '#ef4444',
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="candidato"
                          name={`Candidato ${comparacion.version_candidato}`}
                          stroke="#2563eb"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
                          connectNulls={true}
                          isAnimationActive={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="activa"
                          name={`Vigente ${comparacion.version_activa || 'Producción'}`}
                          stroke="#64748b"
                          strokeWidth={2}
                          strokeDasharray="3 3"
                          dot={{ r: 3, fill: '#64748b', strokeWidth: 0 }}
                          connectNulls={true}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {showDescartarInput && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                    <label className="block text-xs font-semibold text-rose-900">
                      Motivo del descarte (obligatorio)
                    </label>
                    <input
                      type="text"
                      value={descartarComentario}
                      onChange={(e) => setDescartarComentario(e.target.value)}
                      placeholder="Ingrese la justificación técnica del descarte..."
                      className="w-full px-3 py-2 bg-white border border-rose-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowDescartarInput(false)}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={!descartarComentario.trim() || descartarMutation.isPending}
                        onClick={() => {
                          if (descartarComentario.trim()) {
                            descartarMutation.mutate({
                              id: comparacion.id_candidato,
                              comentario: descartarComentario.trim(),
                            });
                          }
                        }}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        {descartarMutation.isPending && (
                          <Loader2 size={13} className="animate-spin" />
                        )}
                        <span>Confirmar Descarte</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    {isAdmin && comparacion.candidato.estado === 'APTA' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `¿Está seguro de publicar la versión ${comparacion.version_candidato} en producción?\n\nEsta versión reemplazará al modelo activo y recalculará automáticamente los pronósticos en el sistema.`
                              )
                            ) {
                              publicarMutation.mutate(comparacion.id_candidato);
                            }
                          }}
                          disabled={publicarMutation.isPending}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {publicarMutation.isPending ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          <span>Publicar en producción</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowDescartarInput((prev) => !prev)}
                          disabled={descartarMutation.isPending}
                          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Descartar
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setComparingModeloId(null);
                      setShowDescartarInput(false);
                    }}
                    className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
