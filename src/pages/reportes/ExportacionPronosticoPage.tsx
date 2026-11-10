import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/useAuth';
import { reportsApi } from '@/api/reports';
import { forecastsApi, PronosticoSkuResumen } from '@/api/forecasts';
import { downloadAuthenticatedBlob } from '@/lib/download';
import { formatDateOnly, formatNumber } from '@/lib/formatters';
import { AlertBanner } from '@/components/common/AlertBanner';
import {
  Download,
  Loader2,
  ChevronDown,
  Calendar,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const ExportacionPronosticoPage: React.FC = () => {
  const { user } = useAuth();
  const isAdminOrAnalyst = user?.rol === 'administrador' || user?.rol === 'analista';

  const [selectedCategoria, setSelectedCategoria] = useState<string>('Todas');
  const [selectedProducto, setSelectedProducto] = useState<string>('Todos');
  const [formato, setFormato] = useState<'csv' | 'xlsx' | 'pdf'>('xlsx');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [lastFailedParams, setLastFailedParams] = useState<{
    formato: 'csv' | 'xlsx' | 'pdf';
    categoria?: string;
    sku?: string;
  } | null>(null);

  const {
    data: previewData,
    isLoading: isPreviewLoading,
    error: previewError,
  } = useQuery({
    queryKey: ['reporte-preview', selectedCategoria, selectedProducto],
    queryFn: () =>
      reportsApi.getPreview(
        selectedCategoria !== 'Todas' ? selectedCategoria : undefined,
        selectedProducto !== 'Todos' ? selectedProducto : undefined
      ),
    staleTime: 30000,
  });

  const { data: pronosticosList } = useQuery({
    queryKey: ['pronosticos-catalogo-exportar'],
    queryFn: () => forecastsApi.listPronosticos(),
    staleTime: 5 * 60 * 1000,
  });

  const productosOrdenados = useMemo(() => {
    if (!pronosticosList?.items) return [];
    return [...pronosticosList.items].sort((a, b) => a.sku.localeCompare(b.sku));
  }, [pronosticosList?.items]);

  const hasNoRecords = !previewData?.items || previewData.items.length === 0;

  const executeExport = async (params: {
    formato: 'csv' | 'xlsx' | 'pdf';
    categoria?: string;
    sku?: string;
  }) => {
    if (!isAdminOrAnalyst) return;
    try {
      setIsExporting(true);
      setErrorBanner(null);
      const res = await reportsApi.exportarPronostico(params);
      await downloadAuthenticatedBlob(res.url_descarga, res.nombre_archivo);
      setSuccessBanner(`Archivo ${res.nombre_archivo} descargado exitosamente.`);
      setLastFailedParams(null);
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Error al descargar el archivo de pronóstico.';
      setErrorBanner(typeof msg === 'string' ? msg : JSON.stringify(msg));
      setLastFailedParams(params);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = () => {
    executeExport({
      formato,
      categoria: selectedCategoria !== 'Todas' ? selectedCategoria : undefined,
      sku: selectedProducto !== 'Todos' ? selectedProducto : undefined,
    });
  };

  return (
    <div className="space-y-6">

      <div className="flex items-center gap-6 border-b border-gray-200 text-sm font-medium">
        <NavLink
          to="/reportes"
          end
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Centro de Reportes
        </NavLink>
        <NavLink
          to="/reportes/exportar"
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Exportación Especializada
        </NavLink>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Exportación de datos de pronóstico
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Filtre y descargue las proyecciones calculadas por el motor de inteligencia artificial
        </p>
      </div>

      {errorBanner && (
        <AlertBanner
          type="danger"
          message={
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
              <span>{errorBanner}</span>
              {lastFailedParams && (
                <button
                  type="button"
                  onClick={() => executeExport(lastFailedParams)}
                  disabled={isExporting}
                  className="px-3 py-1.5 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-xs"
                >
                  {isExporting ? 'Reintentando...' : 'Reintentar exportación'}
                </button>
              )}
            </div>
          }
          onClose={() => {
            setErrorBanner(null);
            setLastFailedParams(null);
          }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="bg-white rounded-xl p-6 shadow-card border border-gray-100 space-y-5">
          <h2 className="text-base font-bold text-gray-900">
            Parámetros de Exportación
          </h2>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Producto
            </label>
            <div className="relative">
              <select
                value={selectedProducto}
                onChange={(e) => setSelectedProducto(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 pr-9 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm cursor-pointer"
              >
                <option value="Todos">Todos los productos</option>
                {productosOrdenados.map((p: PronosticoSkuResumen) => (
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
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Categoría
            </label>
            <div className="relative">
              <select
                value={selectedCategoria}
                onChange={(e) => setSelectedCategoria(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 pr-9 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm cursor-pointer"
              >
                <option value="Todas">Todas las categorías</option>
                <option value="Abarrotes">Abarrotes</option>
                <option value="Bebidas">Bebidas</option>
                <option value="Cuidado Personal">Cuidado Personal</option>
                <option value="Limpieza">Limpieza</option>
                <option value="Lácteos">Lácteos</option>
                <option value="Snacks">Snacks</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Período de pronóstico
            </label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value="Horizonte 14 días (Modelo XGBoost)"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-9 pr-3.5 py-2 text-xs text-gray-600 cursor-not-allowed"
              />
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Formato de exportación
            </label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                <input
                  type="radio"
                  name="formato"
                  value="xlsx"
                  checked={formato === 'xlsx'}
                  onChange={() => setFormato('xlsx')}
                  className="w-4 h-4 text-brand-700 focus:ring-brand-700"
                />
                <span>Excel</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                <input
                  type="radio"
                  name="formato"
                  value="csv"
                  checked={formato === 'csv'}
                  onChange={() => setFormato('csv')}
                  className="w-4 h-4 text-brand-700 focus:ring-brand-700"
                />
                <span>CSV</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                <input
                  type="radio"
                  name="formato"
                  value="pdf"
                  checked={formato === 'pdf'}
                  onChange={() => setFormato('pdf')}
                  className="w-4 h-4 text-brand-700 focus:ring-brand-700"
                />
                <span>PDF</span>
              </label>
            </div>
          </div>

          {isAdminOrAnalyst ? (
            <button
              onClick={handleDownload}
              disabled={isExporting || hasNoRecords || isPreviewLoading}
              className="w-full py-2.5 px-4 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              <span>Descargar archivo</span>
            </button>
          ) : (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 flex items-center gap-2">
              <Lock size={14} className="text-gray-400 shrink-0" />
              <span>Exportación restringida a Administrador y Analista.</span>
            </div>
          )}

          {successBanner && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center gap-2 animate-fade-in">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              <span>{successBanner}</span>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                Vista previa de proyecciones
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                {previewData?.items.length || 0} registros listos
              </span>
            </div>

            {isPreviewLoading ? (
              <div className="flex flex-col items-center justify-center p-16 gap-3">
                <Loader2 className="animate-spin text-brand-700" size={32} />
                <p className="text-xs text-gray-500">Generando vista previa de pronóstico...</p>
              </div>
            ) : previewError ? (
              <div className="p-8 text-center text-rose-600 text-sm">
                Error al cargar la vista previa de pronóstico.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/60 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-5">Producto / SKU</th>
                      <th className="py-3 px-5 text-right">Demanda proy. (14d)</th>
                      <th className="py-3 px-5 text-right">Stock actual</th>
                      <th className="py-3 px-5 text-right">Sugerido compra</th>
                      <th className="py-3 px-5 text-center">Incertidumbre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
                    {hasNoRecords ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-500 text-sm">
                          No hay datos para los filtros seleccionados. Ajuste los filtros antes de exportar.
                        </td>
                      </tr>
                    ) : (
                      previewData?.items.slice(0, 10).map((it) => (
                        <tr key={it.sku} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-5">
                            <div className="font-semibold text-gray-900 truncate max-w-[200px]">
                              {it.nombre_producto}
                            </div>
                            <div className="text-[11px] text-gray-400">{it.sku}</div>
                          </td>
                          <td className="py-3 px-5 text-right font-bold tabular-nums text-gray-900">
                            {formatNumber(it.demanda_proyectada_14d)} unidades
                          </td>
                          <td className="py-3 px-5 text-right tabular-nums text-gray-600">
                            {formatNumber(it.stock_actual)} u.
                          </td>
                          <td className="py-3 px-5 text-right font-bold tabular-nums text-emerald-600">
                            +{formatNumber(it.cantidad_sugerida)} u.
                          </td>
                          <td className="py-3 px-5 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 uppercase">
                              {it.nivel_incertidumbre}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50/50 text-[11px] text-gray-500 flex items-center justify-between">
            <span>Fecha del lote predictivo: {formatDateOnly(previewData?.fecha_generacion)}</span>
            <span>Mostrando primeros 10 registros del lote</span>
          </div>
        </div>
      </div>
    </div>
  );
};
