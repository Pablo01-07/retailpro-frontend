
const LIMA_TZ = 'America/Lima';

export const ensureUtcIso = (dateStr: string): string => {
  const trimmed = dateStr.trim();
  if (!trimmed) return trimmed;

  if (!trimmed.includes('T')) {
    return `${trimmed}T12:00:00Z`;
  }

  if (trimmed.endsWith('Z') || trimmed.endsWith('z')) {
    return trimmed;
  }

  const timePart = trimmed.split('T')[1];
  if (timePart.includes('+') || (timePart.includes('-') && !timePart.startsWith('-'))) {
    return trimmed;
  }

  return `${trimmed}Z`;
};

export const formatDateOnly = (dateStr?: string | null): string => {
  if (!dateStr) return 'Sin fecha';
  try {
    const trimmed = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const [y, m, d] = trimmed.slice(0, 10).split('-');
      return `${d}/${m}/${y}`;
    }
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

export const formatDateDMY = formatDateOnly;

export const formatDateLima = (dateStr?: string | null): string => {
  if (!dateStr) return 'Sin fecha';
  try {
    const trimmed = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-');
      return `${d}/${m}/${y}`;
    }
    const iso = ensureUtcIso(dateStr);
    const d = new Date(iso);
    if (isNaN(d.getTime())) return dateStr;

    const formatter = new Intl.DateTimeFormat('es-PE', {
      timeZone: LIMA_TZ,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return formatter.format(d);
  } catch {
    return dateStr;
  }
};

export const formatDayMonthLima = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    const iso = ensureUtcIso(dateStr);
    const d = new Date(iso);
    if (isNaN(d.getTime())) return dateStr;

    const formatter = new Intl.DateTimeFormat('es-PE', {
      timeZone: LIMA_TZ,
      day: '2-digit',
      month: '2-digit',
    });
    return formatter.format(d);
  } catch {
    return dateStr;
  }
};

export const formatDateTimeLima = (dateStr?: string | null): string => {
  if (!dateStr) return 'Sin fecha';
  try {
    const iso = ensureUtcIso(dateStr);
    const d = new Date(iso);
    if (isNaN(d.getTime())) return dateStr;

    const formatter = new Intl.DateTimeFormat('es-PE', {
      timeZone: LIMA_TZ,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return formatter.format(d);
  } catch {
    return dateStr;
  }
};

export const formatTimeLima = (dateStr?: string | null): string => {
  if (!dateStr) return '--:--';
  try {
    const iso = ensureUtcIso(dateStr);
    const d = new Date(iso);
    if (isNaN(d.getTime())) return dateStr;

    const formatter = new Intl.DateTimeFormat('es-PE', {
      timeZone: LIMA_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return formatter.format(d);
  } catch {
    return dateStr;
  }
};

export const formatModelVersion = (version?: string | null): string => {
  if (!version) return 'v1.0.0';
  const clean = version.trim().replace(/^v+/i, '');
  return `v${clean}`;
};

export const formatDurationSeconds = (seconds?: number | null): string => {
  if (seconds === undefined || seconds === null || isNaN(seconds)) return '--';
  if (seconds > 0 && seconds < 1) return '< 1 s';
  if (seconds === 0) return '< 1 s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
};

export const formatNumber = (num?: number | null): string => {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return Math.round(num).toLocaleString('es-PE');
};

export const formatPct = (val?: number | null, decimals = 1): string => {
  if (val === undefined || val === null || isNaN(val)) return '0.0%';
  return `${val.toFixed(decimals)}%`;
};

export const formatPctOrDash = (val?: number | null, decimals = 1): string => {
  if (val === undefined || val === null || isNaN(val)) return '—';
  return `${val.toFixed(decimals)}%`;
};

export const formatNumOrDash = (
  val?: number | null,
  decimals = 2,
  suffix = ''
): string => {
  if (val === undefined || val === null || isNaN(val)) return '—';
  return `${val.toFixed(decimals)}${suffix ? ` ${suffix}` : ''}`;
};

export interface EstadoProcesoBadgeConfig {
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

export const getEstadoProcesoBadge = (estado?: string | null): EstadoProcesoBadgeConfig => {
  const norm = (estado || '').toUpperCase().trim();
  switch (norm) {
    case 'COMPLETADO':
      return { label: 'COMPLETADO', variant: 'success' };
    case 'CON_ADVERTENCIAS':
      return { label: 'COMPLETADO CON ADVERTENCIAS', variant: 'warning' };
    case 'FALLIDO':
      return { label: 'FALLIDO', variant: 'danger' };
    case 'EN_PROGRESO':
    case 'EN PROGRESO':
      return { label: 'EN PROGRESO', variant: 'info' };
    case 'PENDIENTE':
      return { label: 'PENDIENTE', variant: 'warning' };
    default:
      return { label: estado || '--', variant: 'neutral' };
  }
};
