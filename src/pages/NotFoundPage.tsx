import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface-light flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
        <div className="text-6xl font-extrabold text-brand-700 mb-2">404</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Página no encontrada</h2>
        <p className="text-sm text-gray-500 mb-6">
          La pantalla a la que intentas acceder no existe o fue reubicada en la plataforma.
        </p>
        <Link to="/dashboard">
          <Button variant="primary" size="md" className="w-full" icon={<ArrowLeft size={16} />}>
            Volver al Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
