import React from 'react';
import clsx from 'clsx';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  status?: string;
  title?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  className,
  status,
  title,
}) => {
  let resolvedVariant: BadgeVariant = variant || 'neutral';

  if (status && !variant) {
    const s = status.toUpperCase();
    if (
      s === 'COMPLETADO' ||
      s === 'ACTUALIZADO' ||
      s === 'ACTIVO' ||
      s === 'ACTIVA' ||
      s === 'APROBADO' ||
      s === 'EXITOSO' ||
      s === 'CUMPLE' ||
      s === 'RESUELTA' ||
      s === 'BAJA'
    ) {
      resolvedVariant = 'success';
    } else if (
      s === 'CON_ADVERTENCIAS' ||
      s === 'COMPLETADO CON ADVERTENCIAS' ||
      s === 'DESACTUALIZADO' ||
      s === 'PENDIENTE' ||
      s === 'MEDIA' ||
      s === 'ADVERTENCIA' ||
      s === 'ESTABLE' ||
      s === 'ANTERIOR' ||
      s === 'STOCK BAJO' ||
      s === 'MODERADA'
    ) {
      resolvedVariant = 'warning';
    } else if (
      s === 'FALLIDO' ||
      s === 'INACTIVO' ||
      s === 'INACTIVA' ||
      s === 'CRITICA' ||
      s === 'CRÍTICA' ||
      s === 'ALTA' ||
      s === 'NO CUMPLE' ||
      s === 'DESCARTADA' ||
      s === 'BAJO RENDIMIENTO' ||
      s === 'INTENTO FALLIDO' ||
      s === 'AGOTADO'
    ) {
      resolvedVariant = 'danger';
    } else if (s === 'EN PROGRESO' || s === 'EN_PROGRESO' || s === 'INFO') {
      resolvedVariant = 'info';
    } else if (s.includes('ADMIN') || s.includes('ROL') || s.includes('CAMBIO')) {
      resolvedVariant = 'purple';
    }
  }

  const variantStyles: Record<BadgeVariant, string> = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    neutral: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <span
      title={title}
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variantStyles[resolvedVariant],
        className
      )}
    >
      {children}
    </span>
  );
};
