import React, { useState } from 'react';
import { useAuth } from '@/auth/useAuth';
import { ROLE_LABELS } from '@/types';
import { Search, Bell, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { alertsApi } from '@/api/alerts';
import { forecastsApi } from '@/api/forecasts';

export const Topbar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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

        <Link
          to="/alertas"
          title={`${activeAlertsCount} alertas activas`}
          className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 rounded-full transition-colors"
        >
          <Bell size={20} />
          {activeAlertsCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-red-600 rounded-full border border-white">
              {activeAlertsCount > 9 ? '9+' : activeAlertsCount}
            </span>
          )}
        </Link>

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
