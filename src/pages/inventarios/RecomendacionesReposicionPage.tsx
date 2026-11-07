import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/useAuth';
import {
  replenishmentApi,
  RecomendacionItem,
  ReposicionFilterParams,
} from '@/api/replenishment';
import { downloadAuthenticatedBlob } from '@/lib/download';
import { formatDateOnly } from '@/lib/formatters';
import {
  Download,
  Loader2,
  ChevronDown,
  Info,
  CheckCircle2,
  X,
} from 'lucide-react';

export const RecomendacionesReposicionPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedCategoria, setSelectedCategoria] = useState<string>('Todas');
  const [selectedPrioridad, setSelectedPrioridad] = useState<string>('Todas');

  const [selectedItem, setSelectedItem] = useState<RecomendacionItem | null>(null);
  const [adjustedQty, setAdjustedQty] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('Ajuste por lote mínimo / capacidad de almacén');
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const canEdit = user?.rol === 'administrador' || user?.rol === 'analista';

  const filterParams: ReposicionFilterParams = useMemo(() => {
    const params: ReposicionFilterParams = {};
    if (selectedCategoria !== 'Todas') params.categoria = selectedCategoria;
    if (selectedPrioridad !== 'Todas') params.prioridad = selectedPrioridad;
    return params;
  }, [selectedCategoria, selectedPrioridad]);

  const {
    data: reposicionData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['recomendaciones-reposicion', filterParams],
    queryFn: () => replenishmentApi.getRecomendaciones(filterParams),
    staleTime: 15000,
  });

  const items = reposicionData?.items || [];
  const displayedCount = items.length;
  const totalEvaluados = reposicionData?.total_recomendaciones ?? displayedCount;
  const requierenCompraCount = items.filter((item) => {
    const cant =
      item.cantidad_ajustada !== null && item.cantidad_ajustada !== undefined
        ? item.cantidad_ajustada
        : item.cantidad_sugerida;
    return cant > 0;
  }).length;

  const categoriasDisponibles = useMemo(() => {
    return [
      'Todas',
      'Abarrotes',
      'Bebidas',
      'Cuidado Personal',
      'Limpieza',
      'Lácteos',
      'Snacks',
    ];
  }, []);

  const adjustMutation = useMutation({
    mutationFn: async ({
      idPronostico,
      cantidad,
      motivo,
    }: {
      idPronostico: number;
      cantidad: number;
      motivo: string;
    }) => {
      return replenishmentApi.ajustarCantidad(idPronostico, {
        cantidad_ajustada: cantidad,
        motivo_ajuste: motivo,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recomendaciones-reposicion'] });
      setSuccessBanner(
        `Se registró el ajuste para SKU ${data.sku}: ${data.cantidad_ajustada} unidades guardadas exitosamente.`
      );
      setSelectedItem(null);
      setTimeout(() => setSuccessBanner(null), 6000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'No se pudo registrar el ajuste.';
      setAdjustError(msg);
    },
  });

  const handleExport = async (formato: 'xlsx' | 'csv' = 'xlsx') => {
    if (!canEdit) return;
    try {
      setIsExporting(true);
      const res = await replenishmentApi.exportar({
        formato,
        categoria: selectedCategoria !== 'Todas' ? selectedCategoria : undefined,
        prioridad: selectedPrioridad !== 'Todas' ? selectedPrioridad : undefined,
      });
      await downloadAuthenticatedBlob(res.url_descarga, res.nombre_archivo);
      setSuccessBanner(`Propuesta exportada exitosamente (${res.nombre_archivo}).`);
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch {
      alert('Error al exportar la propuesta de reposición.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenDetail = (item: RecomendacionItem) => {
    setSelectedItem(item);
    setAdjustedQty(
      item.cantidad_ajustada !== null && item.cantidad_ajustada !== undefined
        ? String(item.cantidad_ajustada)
        : String(item.cantidad_sugerida)
    );
    setAdjustReason('Ajuste por lote mínimo / capacidad de almacén');
    setAdjustError(null);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    const qty = parseInt(adjustedQty, 10);
    if (isNaN(qty) || qty < 0) {
      setAdjustError('La cantidad ajustada debe ser un número entero mayor o igual a 0.');
      return;
    }
    adjustMutation.mutate({
      idPronostico: selectedItem.id_pronostico,
      cantidad: qty,
      motivo: adjustReason.trim(),
    });
  };

  return (
    <div className="space-y-6">

      <div className="flex items-center gap-6 border-b border-gray-200 text-sm font-medium">
        <NavLink
          to="/inventarios"
          end
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Recomendaciones de Reposición
        </NavLink>
        <NavLink
          to="/inventarios/nivel-servicio"
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Nivel de Servicio
        </NavLink>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Recomendaciones de reposición
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sugerencias de reabastecimiento inteligente generadas en base a predicciones de demanda del mercado.
          </p>
        </div>
        <div className="text-xs font-medium text-gray-500 bg-gray-100/80 px-3 py-1.5 rounded-lg border border-gray-200/60 self-start sm:self-auto">
          Cálculo con datos hasta:{' '}
          <span className="font-semibold text-gray-800">
            {formatDateOnly(reposicionData?.fecha_generacion) || '--'}
          </span>
        </div>
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

      <div className="bg-white rounded-xl p-5 shadow-card border border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
            <div className="relative">
              <select
                value={selectedCategoria}
                onChange={(e) => setSelectedCategoria(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-3.5 py-2 pr-9 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm cursor-pointer min-w-[190px]"
              >
                <option value="Todas">Todos los departamentos</option>
                {categoriasDisponibles
                  .filter((c) => c !== 'Todas')
                  .map((cat) => (
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
            <label className="block text-xs font-medium text-gray-500 mb-1">Prioridad</label>
            <div className="relative">
              <select
                value={selectedPrioridad}
                onChange={(e) => setSelectedPrioridad(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-3.5 py-2 pr-9 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm cursor-pointer min-w-[150px]"
              >
                <option value="Todas">Alta / Media / Baja</option>
                <option value="ALTA">Alta</option>
                <option value="MEDIA">Media</option>
                <option value="BAJA">Baja</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        <div>
          <button
            onClick={() => handleExport('xlsx')}
            disabled={isExporting || !canEdit}
            title={
              !canEdit
                ? 'Exportación reservada para roles de gestión'
                : 'Descargar propuesta de compra en formato XLSX'
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold rounded-lg border border-gray-300 shadow-sm transition-colors disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 size={15} className="animate-spin text-brand-700" />
            ) : (
              <Download size={15} className="text-gray-600" />
            )}
            <span>Exportar propuesta</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Sugerencias de compra para reposición
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Mostrando {displayedCount} de {totalEvaluados} SKUs evaluados · {requierenCompraCount} requieren compra
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3">
            <Loader2 className="animate-spin text-brand-700" size={36} />
            <p className="text-xs text-gray-500">Cargando recomendaciones de compra...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm">
            Error al consultar las sugerencias de reposición.
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center text-gray-400 text-sm">
            No se encontraron recomendaciones para los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/60 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Producto</th>
                  <th className="py-3 px-5">SKU</th>
                  <th className="py-3 px-5">Categoría</th>
                  <th className="py-3 px-5 text-right">Stock actual</th>
                  <th className="py-3 px-5 text-right">Demanda proj.</th>
                  <th className="py-3 px-5 text-right">Sugerido</th>
                  <th className="py-3 px-5 text-center">Fecha límite</th>
                  <th className="py-3 px-5 text-center">Prioridad</th>
                  <th className="py-3 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
                {items.map((item) => {
                  const hasAdjustment =
                    item.cantidad_ajustada !== null &&
                    item.cantidad_ajustada !== undefined &&
                    item.cantidad_ajustada !== item.cantidad_sugerida;

                  return (
                    <tr key={item.id_pronostico} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-gray-900 max-w-[200px] truncate">
                        {item.nombre_producto}
                      </td>
                      <td className="py-3.5 px-5 text-gray-500">{item.sku}</td>
                      <td className="py-3.5 px-5 text-gray-500">{item.categoria}</td>
                      <td className="py-3.5 px-5 text-right font-bold tabular-nums text-gray-900">
                        {item.stock_actual} u
                      </td>
                      <td className="py-3.5 px-5 text-right tabular-nums text-gray-600">
                        {Math.round(item.demanda_proyectada_14d)} u
                      </td>
                      <td className="py-3.5 px-5 text-right font-bold tabular-nums">
                        {hasAdjustment ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-emerald-700">+{item.cantidad_ajustada} u</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-200">
                              Ajustado
                            </span>
                          </div>
                        ) : (
                          <span className={item.cantidad_sugerida > 0 ? 'text-emerald-600' : 'text-gray-500'}>
                            +{item.cantidad_sugerida} u
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-center tabular-nums text-gray-600">
                        {formatDateOnly(item.fecha_limite)}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        {item.prioridad === 'ALTA' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                            Alta
                          </span>
                        )}
                        {item.prioridad === 'MEDIA' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Media
                          </span>
                        )}
                        {item.prioridad === 'BAJA' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Baja
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => handleOpenDetail(item)}
                          className="text-brand-700 hover:text-brand-900 font-semibold transition-colors hover:underline"
                        >
                          Consultar detalle
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

      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedItem.nombre_producto}</h3>
                <span className="text-xs text-gray-500">{selectedItem.sku} • {selectedItem.categoria}</span>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="text-gray-500">Stock actual</span>
                <div className="text-base font-bold tabular-nums text-gray-900 mt-1">{selectedItem.stock_actual} u</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="text-gray-500">Punto de reorden</span>
                <div className="text-base font-bold tabular-nums text-gray-900 mt-1">{selectedItem.punto_reorden} u</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="text-gray-500">Demanda proyectada 14d</span>
                <div className="text-base font-bold tabular-nums text-gray-900 mt-1">
                  {Math.round(selectedItem.demanda_proyectada_14d)} u
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="text-gray-500">Días de cobertura</span>
                <div className="text-base font-bold tabular-nums text-gray-900 mt-1">{selectedItem.dias_cobertura} días</div>
              </div>
            </div>

            <div className="bg-brand-50/50 p-3.5 rounded-xl border border-brand-100/60 text-xs">
              <div className="font-semibold text-brand-900 flex items-center gap-1.5 mb-1">
                <Info size={14} className="text-brand-700" />
                <span>Criterio de sugerencia (Lead Time: 3 días):</span>
              </div>
              <p className="text-brand-800 leading-relaxed">{selectedItem.motivo_prioridad}</p>
            </div>

            {canEdit ? (
              <form onSubmit={handleSaveAdjustment} className="space-y-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Cantidad a pedir (unidades):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={adjustedQty}
                      onChange={(e) => setAdjustedQty(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm"
                      placeholder="Cantidad"
                      required
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                      und. (Sugerido: {selectedItem.cantidad_sugerida})
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Justificación operativa del ajuste:
                  </label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm"
                    placeholder="Motivo del cambio (auditoría Ley N.° 29733)"
                    required
                  />
                </div>

                {adjustError && (
                  <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                    {adjustError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={adjustMutation.isPending}
                    className="px-5 py-2 bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {adjustMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                    <span>Guardar ajuste</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-xs text-gray-500 text-center py-2">
                Modo solo lectura para Jefe de Logística. Los ajustes requieren rol de Analista o Administrador.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
