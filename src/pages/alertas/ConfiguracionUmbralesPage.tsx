import React, { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/useAuth';
import { thresholdsApi, ActualizarUmbralesRequest } from '@/api/thresholds';
import { AlertBanner } from '@/components/common/AlertBanner';
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
  Save,
} from 'lucide-react';

export const ConfiguracionUmbralesPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.rol === 'administrador';

  const [quiebreProbMin, setQuiebreProbMin] = useState<number>(0);
  const [quiebreDiasCob, setQuiebreDiasCob] = useState<number>(0);
  const [sobrestockPct, setSobrestockPct] = useState<number>(0);
  const [sobrestockDias, setSobrestockDias] = useState<number>(0);
  const [mapeMax, setMapeMax] = useState<number>(15);

  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: umbralesData, isLoading } = useQuery({
    queryKey: ['umbrales-configuracion'],
    queryFn: () => thresholdsApi.getUmbrales(),
    staleTime: 60000,
  });

  useEffect(() => {
    if (umbralesData?.umbrales) {
      const qProb = umbralesData.umbrales.find((u) => u.tipo_umbral === 'quiebre_prob_min');
      const qDias = umbralesData.umbrales.find((u) => u.tipo_umbral === 'quiebre_dias_cobertura');
      const sPct = umbralesData.umbrales.find((u) => u.tipo_umbral === 'sobrestock_pct');
      const sDias = umbralesData.umbrales.find((u) => u.tipo_umbral === 'sobrestock_dias');
      const mMape = umbralesData.umbrales.find((u) => u.tipo_umbral === 'mape_max');

      if (qProb) setQuiebreProbMin(qProb.valor);
      if (qDias) setQuiebreDiasCob(qDias.valor);
      if (sPct) setSobrestockPct(sPct.valor);
      if (sDias) setSobrestockDias(sDias.valor);
      if (mMape) setMapeMax(mMape.valor);
    }
  }, [umbralesData]);

  const configActiva = useMemo(() => {
    const list = umbralesData?.umbrales || [];
    const qProb = list.find((u) => u.tipo_umbral === 'quiebre_prob_min')?.valor;
    const qDias = list.find((u) => u.tipo_umbral === 'quiebre_dias_cobertura')?.valor;
    const sPct = list.find((u) => u.tipo_umbral === 'sobrestock_pct')?.valor;
    const sDias = list.find((u) => u.tipo_umbral === 'sobrestock_dias')?.valor;
    const mMape = list.find((u) => u.tipo_umbral === 'mape_max')?.valor;

    return {
      quiebreProbMin: qProb ?? 0,
      quiebreDiasCob: qDias ?? 0,
      sobrestockPct: sPct ?? 0,
      sobrestockDias: sDias ?? 0,
      mapeMax: mMape ?? 15,
    };
  }, [umbralesData]);

  const saveMutation = useMutation({
    mutationFn: async (payload: ActualizarUmbralesRequest) => {
      return thresholdsApi.actualizarUmbrales(payload);
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(['umbrales-configuracion'], data);
      }
      queryClient.invalidateQueries({ queryKey: ['umbrales-configuracion'] });
      queryClient.invalidateQueries({ queryKey: ['centro-alertas'] });
      queryClient.invalidateQueries({ queryKey: ['active-alerts-count'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-resumen'] });
      setSuccessBanner(
        'Cambios guardados con éxito: El motor ha comenzado a procesar las alertas con los nuevos parámetros de cobertura.'
      );
      setErrorMessage(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Error al guardar la configuración de umbrales.';
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  const handleReset = () => {
    if (umbralesData?.umbrales) {
      const qProb = umbralesData.umbrales.find((u) => u.tipo_umbral === 'quiebre_prob_min');
      const qDias = umbralesData.umbrales.find((u) => u.tipo_umbral === 'quiebre_dias_cobertura');
      const sPct = umbralesData.umbrales.find((u) => u.tipo_umbral === 'sobrestock_pct');
      const sDias = umbralesData.umbrales.find((u) => u.tipo_umbral === 'sobrestock_dias');
      const mMape = umbralesData.umbrales.find((u) => u.tipo_umbral === 'mape_max');

      if (qProb) setQuiebreProbMin(qProb.valor);
      if (qDias) setQuiebreDiasCob(qDias.valor);
      if (sPct) setSobrestockPct(sPct.valor);
      if (sDias) setSobrestockDias(sDias.valor);
      if (mMape) setMapeMax(mMape.valor);
    }
    setErrorMessage(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const sDias = Number(sobrestockDias);
    const qDias = Number(quiebreDiasCob);

    if (sDias <= qDias) {
      setSuccessBanner(null);
      setErrorMessage(
        'El umbral de sobrestock debe ser mayor al umbral de quiebre: los días máximos de cobertura en almacén deben ser mayores a los días de cobertura mínima.'
      );
      return;
    }

    setErrorMessage(null);
    saveMutation.mutate({
      quiebre_prob_min: Number(quiebreProbMin),
      quiebre_dias_cobertura: qDias,
      sobrestock_pct: Number(sobrestockPct),
      sobrestock_dias: sDias,
      mape_max: Number(mapeMax),
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="animate-spin text-brand-700" size={36} />
        <p className="text-sm text-gray-500 font-medium">Cargando parámetros de configuración...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6 border-b border-gray-200 text-sm font-medium">
        <NavLink
          to="/alertas"
          end
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Centro de Alertas
        </NavLink>
        <NavLink
          to="/alertas/umbrales"
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Configuración de Umbrales
        </NavLink>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Configuración de umbrales de alerta
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Establezca los parámetros y sensibilidades para el motor de monitoreo automático
        </p>
      </div>

      {successBanner && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-3.5 rounded-xl text-sm flex items-center gap-3 shadow-xs animate-fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span className="font-medium">{successBanner}</span>
        </div>
      )}

      {errorMessage && (
        <AlertBanner
          type="danger"
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
          <Lock size={16} className="text-amber-600 shrink-0" />
          <span>
            Modo solo lectura. La modificación de umbrales de control operacional está reservada
            estrictamente al Administrador del Sistema.
          </span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 space-y-6">

          <div className="bg-white rounded-xl p-6 shadow-card border border-gray-100 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-gray-900">
                  Parámetros de Quiebre de Stock
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                  Parámetro vigente
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Probabilidad mínima de quiebre para alerta
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={quiebreProbMin}
                    onChange={(e) => setQuiebreProbMin(parseFloat(e.target.value) || 0)}
                    disabled={!isAdmin}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm disabled:bg-gray-50"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                    %
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Disparador basado en la certidumbre estadística del modelo predictivo.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Días de cobertura mínima (Stock crítico)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    step="1"
                    value={quiebreDiasCob}
                    onChange={(e) => setQuiebreDiasCob(parseFloat(e.target.value) || 0)}
                    disabled={!isAdmin}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm disabled:bg-gray-50"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                    días
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Plazo mínimo requerido antes del quiebre físico real del inventario.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-card border border-gray-100 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-gray-900">
                  Parámetros de Sobrestock
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  Parámetro vigente
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Porcentaje máximo sobre demanda proyectada
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="100"
                    max="500"
                    step="1"
                    value={sobrestockPct}
                    onChange={(e) => setSobrestockPct(parseFloat(e.target.value) || 0)}
                    disabled={!isAdmin}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm disabled:bg-gray-50"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                    %
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Límite permitido respecto a la venta estimada para alertar exceso.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Días máximos de cobertura en almacén
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="15"
                    max="365"
                    step="1"
                    value={sobrestockDias}
                    onChange={(e) => setSobrestockDias(parseFloat(e.target.value) || 0)}
                    disabled={!isAdmin}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm disabled:bg-gray-50"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                    días
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Límite absoluto de tiempo de almacenamiento óptimo.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-card border border-gray-100 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-gray-900">
                  Precisión del modelo
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Parámetro vigente
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                MAPE máximo aceptado (demanda 14 días)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="0.1"
                  value={mapeMax}
                  onChange={(e) => setMapeMax(parseFloat(e.target.value) || 0)}
                  disabled={!isAdmin}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm disabled:bg-gray-50"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                  %
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                Error porcentual absoluto medio máximo tolerado en la demanda acumulada a 14 días por SKU.
              </p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={saveMutation.isPending}
                className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs font-semibold rounded-lg transition-colors shadow-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="px-6 py-2.5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {saveMutation.isPending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                <span>Guardar configuración</span>
              </button>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-xl p-6 shadow-card border border-gray-100 space-y-4">
            <h2 className="text-base font-bold text-gray-900">Configuración Activa</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Resumen de los parámetros generales de riesgo actualmente aplicados en todo el catálogo de RetailPro.
            </p>

            <div className="bg-gray-50/80 rounded-xl p-4 divide-y divide-gray-200/60 text-xs font-medium">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-gray-500">Probabilidad Quiebre</span>
                <span className="font-bold text-gray-900">&gt;= {configActiva.quiebreProbMin}%</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-gray-500">Cobertura Crítica</span>
                <span className="font-bold text-gray-900">&lt; {configActiva.quiebreDiasCob} días</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-gray-500">Límite Sobredemanda</span>
                <span className="font-bold text-gray-900">{configActiva.sobrestockPct}%</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-gray-500">Almacenamiento Máx.</span>
                <span className="font-bold text-gray-900">{configActiva.sobrestockDias} días</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-gray-500">MAPE máx. (14 días)</span>
                <span className="font-bold text-gray-900">{configActiva.mapeMax}%</span>
              </div>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px]">
                Modificar estos umbrales recalculará automáticamente las alertas críticas de stock en el panel principal.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
