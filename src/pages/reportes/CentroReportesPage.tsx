import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/useAuth';
import { reportsApi, ReporteHistorialItem } from '@/api/reports';
import { forecastsApi, PronosticoSkuResumen } from '@/api/forecasts';
import { downloadAuthenticatedBlob } from '@/lib/download';
import { formatDateTimeLima } from '@/lib/formatters';
import {
  Package,
  TrendingUp,
  BarChart3,
  Download,
  Loader2,
  ChevronDown,
  CheckCircle2,
  X,
} from 'lucide-react';

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

export const CentroReportesPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedCategoria, setSelectedCategoria] = useState<string>('Todas las categorías');
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('Octubre 2026');
  const [selectedProducto, setSelectedProducto] = useState<string>('Todos los productos');
  const [activeGenerating, setActiveGenerating] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const canExport = user?.rol === 'administrador' || user?.rol === 'analista';

  const {
    data: historialData,
    isLoading: isHistorialLoading,
    error: historialError,
  } = useQuery({
    queryKey: ['reportes-historial'],
    queryFn: () => reportsApi.getHistorial(1, 30),
    staleTime: 15000,
  });

  const { data: pronosticosData } = useQuery({
    queryKey: ['pronosticos-catalogo-reportes'],
    queryFn: () => forecastsApi.listPronosticos(),
    staleTime: 5 * 60 * 1000,
  });

  const handleQuickExport = async (tipo: 'inventario' | 'ventas' | 'indicadores') => {
    if (!canExport) return;
    try {
      setActiveGenerating(tipo);
      const cat = selectedCategoria !== 'Todas las categorías' ? selectedCategoria : undefined;
      let res;
      if (tipo === 'inventario') {
        res = await reportsApi.exportarInventario({ formato: 'xlsx', categoria: cat });
      } else if (tipo === 'ventas') {
        res = await reportsApi.exportarVentas({ formato: 'xlsx', categoria: cat });
      } else {
        res = await reportsApi.exportarIndicadores({ formato: 'xlsx', categoria: cat });
      }

      await downloadAuthenticatedBlob(res.url_descarga, res.nombre_archivo);
      queryClient.invalidateQueries({ queryKey: ['reportes-historial'] });
      setSuccessBanner(`Reporte de ${tipo} generado y descargado exitosamente.`);
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch {
      alert(`Error al generar el reporte de ${tipo}.`);
    } finally {
      setActiveGenerating(null);
    }
  };

  const handleExportPronostico = async (formato: 'xlsx' | 'pdf') => {
    if (!canExport) return;
    try {
      setActiveGenerating(formato);
      const cat = selectedCategoria !== 'Todas las categorías' ? selectedCategoria : undefined;
      const res = await reportsApi.exportarPronostico({ formato, categoria: cat });
      await downloadAuthenticatedBlob(res.url_descarga, res.nombre_archivo);
      queryClient.invalidateQueries({ queryKey: ['reportes-historial'] });
      setSuccessBanner(`Archivo ${res.nombre_archivo} descargado exitosamente.`);
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch {
      alert(`Error al exportar en formato ${formato.toUpperCase()}.`);
    } finally {
      setActiveGenerating(null);
    }
  };

  const handleDownloadHistorical = async (item: ReporteHistorialItem) => {
    try {
      await downloadAuthenticatedBlob(item.url_descarga, item.nombre_archivo);
    } catch {
      alert('Error al descargar el archivo histórico.');
    }
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
        {canExport && (
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
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Centro de reportes y exportación
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Genere, estructure y descargue informes detallados sobre inventarios y ventas
        </p>
      </div>

      {successBanner && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        <div className="bg-white rounded-xl p-6 shadow-card border border-gray-100 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Package size={20} />
            </div>
            <h2 className="text-base font-bold text-gray-900">Reportes de inventario</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Nivel de cobertura, rotación física de stock y SKUs comprometidos.
            </p>
          </div>
          <button
            onClick={() => handleQuickExport('inventario')}
            disabled={!canExport || activeGenerating === 'inventario'}
            title={!canExport ? 'La generación de nuevos reportes está reservada para Administrador y Analista' : undefined}
            className="w-fit px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {activeGenerating === 'inventario' && <Loader2 size={14} className="animate-spin" />}
            <span>Generar reporte</span>
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-card border border-gray-100 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <h2 className="text-base font-bold text-gray-900">Reportes de ventas</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Comparativas de demanda proyectada, comportamiento de SKU estrella y desvíos.
            </p>
          </div>
          <button
            onClick={() => handleQuickExport('ventas')}
            disabled={!canExport || activeGenerating === 'ventas'}
            title={!canExport ? 'La generación de nuevos reportes está reservada para Administrador y Analista' : undefined}
            className="w-fit px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {activeGenerating === 'ventas' && <Loader2 size={14} className="animate-spin" />}
            <span>Generar reporte</span>
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-card border border-gray-100 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <BarChart3 size={20} />
            </div>
            <h2 className="text-base font-bold text-gray-900">Reportes de indicadores</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Nivel de servicio histórico, alertas automatizadas y tiempos de sincronización.
            </p>
          </div>
          <button
            onClick={() => handleQuickExport('indicadores')}
            disabled={!canExport || activeGenerating === 'indicadores'}
            title={!canExport ? 'La generación de nuevos reportes está reservada para Administrador y Analista' : undefined}
            className="w-fit px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {activeGenerating === 'indicadores' && <Loader2 size={14} className="animate-spin" />}
            <span>Generar reporte</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-card border border-gray-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Período selector</label>
            <div className="relative">
              <select
                value={selectedPeriodo}
                onChange={(e) => setSelectedPeriodo(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3.5 py-2 pr-9 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm cursor-pointer"
              >
                <option value="Octubre 2026">Octubre 2026</option>
                <option value="Septiembre 2026">Septiembre 2026</option>
                <option value="Agosto 2026">Agosto 2026</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
            <div className="relative">
              <select
                value={selectedCategoria}
                onChange={(e) => setSelectedCategoria(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3.5 py-2 pr-9 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm cursor-pointer"
              >
                <option value="Todas las categorías">Todas las categorías</option>
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
            <label className="block text-xs font-medium text-gray-500 mb-1">Producto</label>
            <div className="relative">
              <select
                value={selectedProducto}
                onChange={(e) => setSelectedProducto(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3.5 py-2 pr-9 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm cursor-pointer"
              >
                <option value="Todos los productos">Todos los productos</option>
                {pronosticosData?.items
                  ?.filter((p: PronosticoSkuResumen) => selectedCategoria === 'Todas las categorías' || p.categoria === selectedCategoria)
                  ?.map((p: PronosticoSkuResumen) => (
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
        </div>

        <div className="flex items-center gap-2.5 self-end lg:self-center">
          <button
            onClick={() => handleExportPronostico('xlsx')}
            disabled={!canExport || activeGenerating === 'xlsx'}
            title={!canExport ? 'La exportación directa está reservada para Administrador y Analista' : undefined}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {activeGenerating === 'xlsx' && <Loader2 size={14} className="animate-spin text-brand-700" />}
            <span>Exportar Excel</span>
          </button>
          <button
            onClick={() => handleExportPronostico('pdf')}
            disabled={!canExport || activeGenerating === 'pdf'}
            title={!canExport ? 'La exportación directa está reservada para Administrador y Analista' : undefined}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {activeGenerating === 'pdf' && <Loader2 size={14} className="animate-spin text-brand-700" />}
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Historial de reportes autogenerados
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Mostrando {historialData?.items.length ?? 0} de {historialData?.total ?? historialData?.items.length ?? 0} reportes generados
            </p>
          </div>
        </div>

        {isHistorialLoading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3">
            <Loader2 className="animate-spin text-brand-700" size={32} />
            <p className="text-xs text-gray-500">Consultando historial en almacenamiento...</p>
          </div>
        ) : historialError ? (
          <div className="p-8 text-center text-rose-600 text-sm">
            Error al consultar el historial de reportes.
          </div>
        ) : (historialData?.items || []).length === 0 ? (
          <div className="p-16 text-center text-gray-400 text-sm">
            No existen reportes físicos registrados en el almacenamiento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/60 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Nombre del reporte</th>
                  <th className="py-3 px-5 text-center">Tipo</th>
                  <th className="py-3 px-5 text-center">Fecha de generación</th>
                  <th className="py-3 px-5 text-center">Formato</th>
                  <th className="py-3 px-5 text-right">Tamaño</th>
                  <th className="py-3 px-5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
                {historialData?.items.map((item) => {
                  const ext = (item.formato || '').toLowerCase();
                  const tipo = (item.tipo || item.tipo_reporte || 'general').replace(/_/g, ' ');
                  const fecha = item.fecha || item.fecha_generacion;
                  const displayName = item.nombre || item.nombre_archivo;

                  return (
                    <tr key={item.id_auditoria} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-gray-900 max-w-[280px] truncate" title={item.nombre_archivo}>
                        {displayName}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700 capitalize">
                          {tipo}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center text-gray-500">
                        {formatDateTimeLima(fecha)}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        {ext === 'xlsx' || ext === 'excel' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Excel
                          </span>
                        ) : ext === 'pdf' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            PDF
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            CSV
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-gray-600">
                        {formatBytes(item.tamano_bytes || 0)}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => handleDownloadHistorical(item)}
                          className="text-brand-700 hover:text-brand-900 font-semibold transition-colors hover:underline flex items-center justify-end gap-1 ml-auto"
                        >
                          <Download size={13} />
                          <span>Descargar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
