import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from './useAuth';
import { RoleCode, ROLE_LABELS } from '@/types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: RoleCode[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-light">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-700 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-500 font-medium">Cargando sesión...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.rol)) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] p-6">
        <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso Restringido (403)</h2>
          <p className="text-sm text-gray-600 mb-4">
            Tu rol actual (<strong className="text-gray-800">{ROLE_LABELS[user.rol]}</strong>) no tiene los permisos necesarios para acceder a este módulo.
          </p>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 mb-6 text-left">
            Si necesitas acceso operativo a esta sección, solicita la actualización de tus privilegios al <strong>Administrador de Sistemas</strong>.
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <ArrowLeft size={16} />
            Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
