import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/useAuth';
import { ROLE_LABELS } from '@/types';
import { Search, Bell, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { alertsApi } from '@/api/alerts';
import { forecastsApi } from '@/api/forecasts';
import { notificationsApi, NotificacionCargaItem } from '@/api/notifications';
import { formatDateTimeLima } from '@/lib/formatters';

export const Topbar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: alertsData } = useQuery({
    queryKey: ['active-alerts-count'],
    queryFn: () => alertsApi.getAlertas({ estado: 'Activa' }),
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const activeAlertsCount =
    typeof alertsData?.total_activas === 'number'
      ? alertsData.total_activas
      : (alertsData?.items?.filter((i) => (i.estado || '').toUpperCase() === 'ACTIVA').length ?? 0);

  const { data: notifCargas, isLoading: isLoadingCargas } = useQuery({
    queryKey: ['notificaciones-cargas'],
    queryFn: () => notificationsApi.getNotificacionesCargas(10),
    enabled: isPanelOpen,
    refetchInterval: 30000,
  });

  const { data: notifModelos, isLoading: isLoadingModelos } = useQuery({
    queryKey: ['notificaciones-modelos'],
    queryFn: () => notificationsApi.getNotificacionesModelos(10),
    enabled: isPanelOpen,
    refetchInterval: 30000,
  });

  const notificaciones = useMemo(() => {
    const listCargas = notifCargas || [];
    const listModelos = notifModelos || [];
    const combined = [...listCargas];
    const seen = new Set(
      combined.map((c) => `${c.tipo_carga}_${c.id_carga}_${c.fecha_ejecucion}`)
    );
    for (const m of listModelos) {
      const key = `${m.tipo_carga}_${m.id_carga}_${m.fecha_ejecucion}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(m);
      }
    }
    combined.sort(
      (a, b) => new Date(b.fecha_ejecucion).getTime() - new Date(a.fecha_ejecucion).getTime()
    );
    return combined.slice(0, 10);
  }, [notifCargas, notifModelos]);

  const isLoadingNotifs = isLoadingCargas || isLoadingModelos;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPanelOpen(false);
      }
    };
    if (isPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPanelOpen]);

  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const query = searchTerm.trim().toUpperCase();
      if (!query) return;

      setIsSearching(true);
      setSearchError(null);

      try {
        await forecastsApi.getForecastBySku(query);
        setSearchError(null);
        navigate(`/prediccion?sku=${encodeURIComponent(query)}`);
      } catch {
        setSearchError(`El SKU "${query}" no fue encontrado en el catálogo.`);
        setTimeout(() => setSearchError(null), 4000);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'RP';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleNotifClick = (item: NotificacionCargaItem) => {
    if (item.tipo_carga === 'entrenamiento') {
      setIsPanelOpen(false);
      navigate('/prediccion/historial');
      return;
    }
    if (item.tipo_notificacion === 'advertencia_calidad') {
      setIsPanelOpen(false);
      navigate('/datos/calidad');
      return;
    }
  };

  return (
    <header className="h-20 bg-surface-light px-8 flex items-center justify-between border-b border-gray-200/80 shrink-0 relative">
      <div className="w-full max-w-md relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            {isSearching ? (
              <Loader2 size={18} className="animate-spin text-brand-700" />
            ) : (
              <Search size={18} />
            )}
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (searchError) setSearchError(null);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Buscar transacciones, archivos..."
            className="w-full pl-10 pr-4 py-2 bg-gray-200/70 border-none rounded-lg text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-700/50 transition-all"
          />
        </div>

        {searchError && (
          <div className="absolute top-12 left-0 z-50 bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-lg text-xs shadow-lg flex items-center gap-2">
            <span>{searchError}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsPanelOpen((prev) => !prev)}
            title={`${activeAlertsCount} alertas activas`}
            className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 rounded-full transition-colors cursor-pointer"
          >
            <Bell size={20} />
            {activeAlertsCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-red-600 rounded-full border border-white">
                {activeAlertsCount > 9 ? '9+' : activeAlertsCount}
              </span>
            )}
          </button>

          {isPanelOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-fade-in">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Notificaciones</h3>
                <span className="text-[11px] text-gray-400 font-medium">Cargas recientes</span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {isLoadingNotifs ? (
                  <div className="py-8 flex flex-col items-center justify-center text-gray-400 gap-2">
                    <Loader2 size={20} className="animate-spin text-brand-700" />
                    <span className="text-xs">Cargando notificaciones...</span>
                  </div>
                ) : !notificaciones || notificaciones.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-gray-500">
                    No hay notificaciones de cargas recientes.
                  </div>
                ) : (
                  notificaciones.map((item) => {
                    const isModelo = item.tipo_carga === 'entrenamiento';
                    const isDescartada =
                      isModelo &&
                      (item.tipo_notificacion === 'advertencia' ||
                        item.mensaje.toLowerCase().includes('descartad'));
                    const isApto =
                      isModelo &&
                      (item.tipo_notificacion === 'exito' ||
                        item.mensaje.toLowerCase().includes('apto'));
                    const isCalidadAdv = item.tipo_notificacion === 'advertencia_calidad';
                    const isClickable = isModelo || isCalidadAdv;

                    return (
                      <div
                        key={`${item.tipo_carga}_${item.id_carga}_${item.fecha_ejecucion}`}
                        onClick={() => handleNotifClick(item)}
                        className={`p-3.5 flex items-start gap-3 transition-colors ${
                          isDescartada || isCalidadAdv
                            ? 'cursor-pointer hover:bg-amber-50/70 bg-amber-50/20'
                            : isApto
                            ? 'cursor-pointer hover:bg-emerald-50/70 bg-emerald-50/20'
                            : isClickable
                            ? 'cursor-pointer hover:bg-gray-50/70'
                            : 'hover:bg-gray-50/70'
                        }`}
                      >
                        {isDescartada || isCalidadAdv ? (
                          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-800 leading-snug break-words">
                            {item.mensaje}
                          </p>
                          <span className="block text-[11px] text-gray-400 mt-1 tabular-nums">
                            {formatDateTimeLima(item.fecha_ejecucion)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                <Link
                  to="/alertas"
                  onClick={() => setIsPanelOpen(false)}
                  className="text-xs font-semibold text-brand-700 hover:text-brand-800 hover:underline transition-colors"
                >
                  Ver centro de alertas ({activeAlertsCount} activas)
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-gray-300"></div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-900 leading-tight">
              {user?.nombre_completo || 'Usuario'}
            </div>
            <div className="text-xs text-gray-500 font-medium">
              {user?.rol ? ROLE_LABELS[user.rol] : 'Acceso Autorizado'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-sm font-bold text-emerald-800 shadow-sm">
            {getInitials(user?.nombre_completo)}
          </div>
        </div>
      </div>
    </header>
  );
};
