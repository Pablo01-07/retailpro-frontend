import React from 'react';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type AlertBannerType = 'warning' | 'success' | 'danger' | 'info';

interface AlertBannerProps {
  type?: AlertBannerType;
  message: React.ReactNode;
  title?: string;
  onClose?: () => void;
  className?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type = 'warning',
  message,
  title,
  onClose,
  className,
}) => {
  const styles: Record<AlertBannerType, { container: string; icon: React.ReactNode }> = {
    warning: {
      container: 'bg-amber-50 border-amber-300 text-amber-900',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
    },
    success: {
      container: 'bg-emerald-50 border-emerald-300 text-emerald-900',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
    },
    danger: {
      container: 'bg-red-50 border-red-300 text-red-900',
      icon: <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />,
    },
    info: {
      container: 'bg-blue-50 border-blue-300 text-blue-900',
      icon: <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />,
    },
  };

  return (
    <div
      className={clsx(
        'w-full p-4 rounded-xl border flex items-start gap-3 text-sm shadow-sm transition-all',
        styles[type].container,
        className
      )}
    >
      {styles[type].icon}
      <div className="flex-1">
        {title && <h4 className="font-semibold mb-0.5 text-inherit">{title}</h4>}
        <div className="text-inherit leading-relaxed">{message}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-inherit opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
