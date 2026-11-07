import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { auditApi, AuditLogResponse, AuditFilterParams } from '@/api/audit';
import { usersApi } from '@/api/users';
import { formatDateTimeLima } from '@/lib/formatters';
import { downloadAuthenticatedBlob } from '@/lib/download';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Users,
  Download,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldCheck,
  RefreshCw,
  Info,
  Copy,
  Check,
} from 'lucide-react';

const KEY_TRANSLATIONS: Record<string, string> = {
  ip: 'Dirección IP',
  client_ip: 'Dirección IP',
  correo: 'Correo',
  email: 'Correo',
  id_usuario: 'ID Usuario',
  id_usuario_modificado: 'Usuario modificado',
  rol: 'Rol',
  nuevo_rol: 'Nuevo rol',
  rol_anterior: 'Rol anterior',
  accion: 'Acción',
  estado: 'Estado',
  nuevo_estado: 'Nuevo estado',
  motivo: 'Motivo',
  comentario: 'Comentario',
  sku: 'Código SKU',
  id_alerta: 'ID Alerta',
  id_modelo: 'ID Modelo',
  modelo: 'Modelo',
  cambios: 'Cambios',
  filas_afectadas: 'Filas afectadas',
  metodo: 'Método HTTP',
  endpoint: 'Ruta API',
  resultado: 'Resultado',
  duracion_ms: 'Duración (ms)',
  descripcion: 'Descripción',
  cantidad: 'Cantidad',
  tipo: 'Tipo',
};

function sanitizeAndTranslateMetadata(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeAndTranslateMetadata(item));
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('hash') ||
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('clave')
    ) {
      const translatedKey = KEY_TRANSLATIONS[key] || key;
      result[translatedKey] = '••••••••';
      continue;
    }

    const translatedKey = KEY_TRANSLATIONS[key] || key;
    if (typeof value === 'object' && value !== null) {
      result[translatedKey] = sanitizeAndTranslateMetadata(value);
    } else {
      result[translatedKey] = value;
    }
  }
  return result;
}

export const AuditoriaSistemaPage: React.FC = () => {
  const navigate = useNavigate();

  const [filterPeriodo, setFilterPeriodo] = useState<string>('todos');
  const [filterUsuario, setFilterUsuario] = useState<string>('todos');
  const [filterAccion, setFilterAccion] = useState<string>('todos');
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  const [appliedFilters, setAppliedFilters] = useState<{
    periodo: string;
    id_usuario?: number;
    accion?: string;
    estado: string;
  }>({
    periodo: 'todos',
    estado: 'todos',
  });

  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const { data: usersData } = useQuery({
    queryKey: ['usuarios-auditoria-lookup'],
    queryFn: () => usersApi.listUsers({ size: 100 }),
    staleTime: 60000,
  });

  const usersMap = useMemo(() => {
    const map = new Map<number, { nombre: string; correo: string }>();
    if (usersData?.items) {
      usersData.items.forEach((u) => {
        map.set(u.id_usuario, { nombre: u.nombre_completo, correo: u.correo });
      });
    }
    return map;
  }, [usersData]);

  const queryParams: AuditFilterParams = useMemo(() => {
    const params: AuditFilterParams = {
      page,
      size: pageSize,
    };

    if (appliedFilters.id_usuario) {
      params.id_usuario = appliedFilters.id_usuario;
    }

    if (appliedFilters.accion && appliedFilters.accion !== 'todos') {
      params.accion = appliedFilters.accion;
    }

    const today = new Date();
    if (appliedFilters.periodo === '7d') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      params.fecha_inicio = past.toISOString().split('T')[0];
    } else if (appliedFilters.periodo === '30d') {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      params.fecha_inicio = past.toISOString().split('T')[0];
    } else if (appliedFilters.periodo === '90d') {
      const past = new Date();
      past.setDate(today.getDate() - 90);
      params.fecha_inicio = past.toISOString().split('T')[0];
    }

    return params;
  }, [page, appliedFilters]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['auditoria-logs', queryParams],
    queryFn: () => auditApi.listAuditLogs(queryParams),
    staleTime: 15000,
  });

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    if (appliedFilters.estado === 'exitoso') {
      return data.items.filter((it) => !it.accion.toLowerCase().includes('fallido'));
    }
    if (appliedFilters.estado === 'fallido') {
      return data.items.filter((it) => it.accion.toLowerCase().includes('fallido'));
    }
    return data.items;
  }, [data?.items, appliedFilters.estado]);

  const selectedLog = useMemo(() => {
    if (!filteredItems.length) return null;
    if (selectedLogId !== null) {
      const found = filteredItems.find((it) => it.id_auditoria === selectedLogId);
      if (found) return found;
    }
    return filteredItems[0];
  }, [filteredItems, selectedLogId]);

  const [copiedMetadata, setCopiedMetadata] = useState<boolean>(false);

  const formattedMetadata = useMemo(() => {
    if (!selectedLog?.detalle || typeof selectedLog.detalle !== 'object') return '';
    const sanitized = sanitizeAndTranslateMetadata(selectedLog.detalle);
    return JSON.stringify(sanitized, null, 2);
  }, [selectedLog]);

  const handleCopyJson = async () => {
    if (!formattedMetadata) return;
    try {
      await navigator.clipboard.writeText(formattedMetadata);
      setCopiedMetadata(true);
      setTimeout(() => setCopiedMetadata(false), 2000);
    } catch (err) {
      console.error('Error al copiar JSON:', err);
    }
  };

  const handleApplyFilters = () => {
    setPage(1);
    setAppliedFilters({
      periodo: filterPeriodo,
      id_usuario: filterUsuario !== 'todos' ? Number(filterUsuario) : undefined,
      accion: filterAccion !== 'todos' ? filterAccion : undefined,
      estado: filterEstado,
    });
  };

  const handleResetFilters = () => {
    setFilterPeriodo('todos');
    setFilterUsuario('todos');
    setFilterAccion('todos');
    setFilterEstado('todos');
    setPage(1);
    setAppliedFilters({
      periodo: 'todos',
      estado: 'todos',
    });
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      await downloadAuthenticatedBlob('/auditoria/exportar', 'auditoria_sistema.csv');
    } catch (err) {
      alert('Error al descargar el archivo de auditoría.');
    } finally {
      setIsExporting(false);
    }
  };

  const getActionInfo = (accion: string) => {
    const act = accion.toLowerCase();
    if (act.includes('login') || act.includes('inicio_sesion') || act.includes('sesion')) {
      return { label: 'Inicio de sesión', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (act.includes('fallido') || act.includes('fail') || act.includes('error')) {
      return { label: 'Intento fallido', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (act.includes('password') || act.includes('clave') || act.includes('contraseña')) {
      return { label: 'Cambio de contraseña', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
    if (act.includes('export') || act.includes('descarga')) {
      return { label: 'Exportación', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    if (act.includes('crear') || act.includes('usuario')) {
      return { label: 'Gestión usuarios', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (act.includes('ajuste') || act.includes('reposicion') || act.includes('umbral')) {
      return { label: 'Edición parámetros', color: 'bg-teal-50 text-teal-700 border-teal-200' };
    }
    if (act.includes('config')) {
      return { label: accion, color: 'bg-teal-50 text-teal-700 border-teal-200' };
    }
    if (act.includes('carga') || act.includes('etl') || act.includes('proceso')) {
      return { label: 'Procesamiento datos', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
    return { label: accion, color: 'bg-gray-100 text-gray-700 border-gray-200' };
  };

  const getUserName = (log: AuditLogResponse) => {
    if (log.id_usuario && usersMap.has(log.id_usuario)) {
      return usersMap.get(log.id_usuario)!.nombre;
    }
    if (log.detalle && typeof log.detalle === 'object') {
      const det = log.detalle as Record<string, any>;
      if (det.correo) return det.correo;
      if (det.username) return det.username;
    }
    if (log.id_usuario) return `Usuario #${log.id_usuario}`;
    return 'Sistema';
  };

  const getUserEmail = (log: AuditLogResponse) => {
    if (log.id_usuario && usersMap.has(log.id_usuario)) {
      return usersMap.get(log.id_usuario)!.correo;
    }
    if (log.detalle && typeof log.detalle === 'object') {
      const det = log.detalle as Record<string, any>;
      if (det.correo) return det.correo;
    }
    return '--';
  };

  const getIpAddress = (log: AuditLogResponse): string => {
    if (log.detalle && typeof log.detalle === 'object') {
      const det = log.detalle as Record<string, any>;
      if (det.ip) return String(det.ip);
      if (det.client_ip) return String(det.client_ip);
    }
    return '--';
  };

  const getReadableDescription = (log: AuditLogResponse): string => {
    const act = log.accion.toLowerCase();
    const det = (log.detalle || {}) as Record<string, any>;

    if (typeof det.descripcion === 'string' && det.descripcion.trim().length > 0) {
      return det.descripcion;
    }
    if (typeof det.description === 'string' && det.description.trim().length > 0) {
      return det.description;
    }
    if (typeof (log as any).descripcion === 'string' && (log as any).descripcion.trim().length > 0) {
      return (log as any).descripcion;
    }

    if (act.includes('config')) {
      return log.accion;
    }

    if (act.includes('login') || act.includes('sesion')) {
      return `Inicio de sesión exitoso en la plataforma desde la dirección IP ${getIpAddress(log)}.`;
    }
    if (act.includes('fallido')) {
      return `Intento de acceso denegado por credenciales incorrectas o cuenta inactiva. IP: ${getIpAddress(log)}.`;
    }
    if (act.includes('cambio_contraseña') || act.includes('password')) {
      return `Restablecimiento de credenciales de seguridad auditado conforme a políticas corporativas.`;
    }
    if (act.includes('crear_usuario')) {
      return `Creación y alta de cuenta autorizada para ${det.correo || 'nuevo colaborador'} con rol ${det.rol || 'asignado'}.`;
    }
    if (act.includes('actualizar_usuario')) {
      return `Modificación de parámetros y permisos de cuenta para el usuario ID ${det.id_usuario_modificado || ''}.`;
    }
    if (act.includes('desactivar_usuario')) {
      return `Baja lógica y revocación de acceso a la cuenta ${det.correo || ''}.`;
    }
    if (act.includes('ajuste_reposicion')) {
      return `Ajuste manual de unidades en propuesta de compra para SKU con justificación auditada.`;
    }
    if (act.includes('actualizar_umbrales')) {
      return `Actualización de umbrales globales de stock y sincronización automática de alertas del catálogo.`;
    }
    if (act.includes('exportar')) {
      return `Generación y exportación de archivo auditado por usuario autenticado.`;
    }
    if (typeof log.detalle === 'string') return log.detalle;
    return `Operación registrada en el módulo de ${log.modulo_afectado}.`;
  };

  const kpis = data?.kpis || {
    total_actions: 0,
    successful_actions: 0,
    success_rate_pct: 0,
    failed_actions: 0,
    failure_rate_pct: 0,
    active_users: 0,
  };

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Auditoría del sistema
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck size={12} />
              Ley N.° 29733
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Registra y consulta las actividades realizadas por los usuarios en la plataforma
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 bg-white"
            title="Actualizar registros"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin text-brand-700' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Acciones en total</span>
            <div className="text-3xl font-extrabold text-gray-900 mt-2 tracking-tight">
              {kpis.total_actions}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-brand-700 font-semibold mt-2">
              <Activity size={14} />
              <span>Bitácora activa</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Activity size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Acciones exitosas</span>
            <div className="text-3xl font-extrabold text-gray-900 mt-2 tracking-tight">
              {kpis.successful_actions}
            </div>
            <div className="text-xs text-emerald-600 font-semibold mt-2">
              {kpis.success_rate_pct}% de efectividad
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Acciones fallidas</span>
            <div className="text-3xl font-extrabold text-gray-900 mt-2 tracking-tight">
              {kpis.failed_actions}
            </div>
            <div className="text-xs text-rose-600 font-semibold mt-2">
              {kpis.failure_rate_pct}% de tasa de fallo
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Usuarios activos</span>
            <div className="text-3xl font-extrabold text-gray-900 mt-2 tracking-tight">
              {kpis.active_users}
            </div>
            <div className="text-xs text-gray-500 font-medium mt-2">
              Cuentas habilitadas
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users size={20} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 space-y-4">
        <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Filtros</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Periodo</label>
            <div className="relative">
              <select
                value={filterPeriodo}
                onChange={(e) => setFilterPeriodo(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3.5 py-2 pr-9 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700/30 cursor-pointer"
              >
                <option value="todos">Todo el historial</option>
                <option value="7d">Últimos 7 días</option>
                <option value="30d">Últimos 30 días</option>
                <option value="90d">Últimos 90 días</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Usuario</label>
            <div className="relative">
              <select
                value={filterUsuario}
                onChange={(e) => setFilterUsuario(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3.5 py-2 pr-9 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700/30 cursor-pointer"
              >
                <option value="todos">Todos los usuarios</option>
                {(usersData?.items || []).map((u) => (
                  <option key={u.id_usuario} value={u.id_usuario}>
                    {u.nombre_completo}
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
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo de acción</label>
            <div className="relative">
              <select
                value={filterAccion}
                onChange={(e) => setFilterAccion(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3.5 py-2 pr-9 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700/30 cursor-pointer"
              >
                <option value="todos">Todas las acciones</option>
                <option value="login">Inicio de sesión</option>
                <option value="fallido">Intento fallido</option>
                <option value="usuario">Gestión de usuarios</option>
                <option value="password">Cambio de contraseña</option>
                <option value="exportar">Exportación</option>
                <option value="ajuste">Ajuste de reposición</option>
                <option value="umbrales">Configuración umbrales</option>
                <option value="config">Configuración de procesos</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Estado</label>
            <div className="relative">
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3.5 py-2 pr-9 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700/30 cursor-pointer"
              >
                <option value="todos">Todos</option>
                <option value="exitoso">Exitoso</option>
                <option value="fallido">Fallido</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
          >
            Limpiar
          </button>
          <button
            onClick={handleApplyFilters}
            className="px-5 py-2 text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            Aplicar filtros
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">

        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Registro de auditoría</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Mostrando {data?.items?.length ?? 0} de {data?.total ?? 0} registros encontrados
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCsv}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 shadow-sm transition-colors disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 size={14} className="animate-spin text-brand-700" />
              ) : (
                <Download size={14} />
              )}
              <span>Exportar</span>
            </button>
            <button
              onClick={() => navigate('/alertas/umbrales')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 shadow-sm transition-colors"
            >
              <Settings size={14} />
              <span>Configurar alertas</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">

          <div className="lg:col-span-8 flex flex-col justify-between overflow-x-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-16 gap-3">
                <Loader2 size={32} className="animate-spin text-brand-700" />
                <span className="text-xs text-gray-500 font-medium">Cargando bitácora de auditoría...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-16 text-center text-gray-500 text-sm">
                No se encontraron eventos con los filtros seleccionados.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 font-semibold">Fecha y hora</th>
                    <th className="py-3.5 px-4 font-semibold">Usuario</th>
                    <th className="py-3.5 px-4 font-semibold">Acción</th>
                    <th className="py-3.5 px-4 font-semibold">Estado</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems.map((log) => {
                    const actionInfo = getActionInfo(log.accion);
                    const isFailed = log.accion.toLowerCase().includes('fallido');
                    const isSelected = selectedLog?.id_auditoria === log.id_auditoria;

                    return (
                      <tr
                        key={log.id_auditoria}
                        onClick={() => setSelectedLogId(log.id_auditoria)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-50/50 font-medium border-l-4 border-l-brand-700'
                            : 'hover:bg-gray-50/70'
                        }`}
                      >
                        <td className="py-3 px-4 text-gray-600 tabular-nums whitespace-nowrap">
                          {formatDateTimeLima(log.fecha_hora)}
                        </td>
                        <td className="py-3 px-4 text-gray-900 font-semibold whitespace-nowrap">
                          {getUserName(log)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${actionInfo.color}`}
                          >
                            {actionInfo.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                              isFailed
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {isFailed ? 'Fallido' : 'Exitoso'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLogId(log.id_auditoria);
                            }}
                            className={`p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors ${
                              isSelected ? 'text-brand-700 bg-brand-50' : ''
                            }`}
                            title="Ver detalles"
                          >
                            •••
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {data && data.pages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>
                  Mostrando {(data.page - 1) * data.size + 1} -{' '}
                  {Math.min(data.page * data.size, data.total)} de {data.total} resultados
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={data.page <= 1}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: Math.min(data.pages, 5) }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors ${
                        data.page === pg
                          ? 'bg-brand-700 text-white'
                          : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {pg}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, data.pages))}
                    disabled={data.page >= data.pages}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 p-5 bg-gray-50/40">
            {selectedLog ? (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Detalles del registro</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {getUserName(selectedLog)} • {getActionInfo(selectedLog.accion).label} •{' '}
                    {selectedLog.accion.toLowerCase().includes('fallido') ? 'Fallido' : 'Exitoso'}
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <span className="block font-semibold text-gray-500 text-[11px] uppercase tracking-wider">
                      Fecha y hora
                    </span>
                    <span className="block text-gray-800 font-medium mt-1">
                      {formatDateTimeLima(selectedLog.fecha_hora)}
                    </span>
                  </div>

                  <div>
                    <span className="block font-semibold text-gray-500 text-[11px] uppercase tracking-wider">
                      Usuario
                    </span>
                    <span className="block text-gray-900 font-bold mt-1">
                      {getUserName(selectedLog)}
                    </span>
                    <span className="block text-gray-500 text-[11px]">
                      {getUserEmail(selectedLog)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="block font-semibold text-gray-500 text-[11px] uppercase tracking-wider mb-1">
                        Acción
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          getActionInfo(selectedLog.accion).color
                        }`}
                      >
                        {getActionInfo(selectedLog.accion).label}
                      </span>
                    </div>

                    <div>
                      <span className="block font-semibold text-gray-500 text-[11px] uppercase tracking-wider mb-1">
                        Estado
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          selectedLog.accion.toLowerCase().includes('fallido')
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {selectedLog.accion.toLowerCase().includes('fallido') ? 'Fallido' : 'Exitoso'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="block font-semibold text-gray-500 text-[11px] uppercase tracking-wider">
                      Módulo afectado
                    </span>
                    <span className="inline-block px-2.5 py-1 mt-1 bg-white border border-gray-200 rounded-lg text-gray-700 font-medium text-xs capitalize">
                      {selectedLog.modulo_afectado}
                    </span>
                  </div>

                  <div>
                    <span className="block font-semibold text-gray-500 text-[11px] uppercase tracking-wider">
                      Dirección IP
                    </span>
                    <span className="block text-gray-700 tabular-nums text-xs mt-1 bg-white px-2.5 py-1 border border-gray-200 rounded-lg inline-block">
                      {getIpAddress(selectedLog)}
                    </span>
                  </div>

                  <div>
                    <span className="block font-semibold text-gray-500 text-[11px] uppercase tracking-wider">
                      Descripción
                    </span>
                    <p className="mt-1 text-gray-700 leading-relaxed bg-white p-3 rounded-xl border border-gray-200 text-xs">
                      {getReadableDescription(selectedLog)}
                    </p>
                  </div>

                  {selectedLog.detalle && typeof selectedLog.detalle === 'object' && Object.keys(selectedLog.detalle).length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="block font-semibold text-gray-500 text-[11px] uppercase tracking-wider">
                          Metadata técnica
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyJson}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-md transition-colors"
                          title="Copiar JSON formateado al portapapeles"
                        >
                          {copiedMetadata ? (
                            <>
                              <Check size={12} className="text-emerald-600" />
                              <span className="text-emerald-700">¡Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copiar JSON</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3 bg-slate-900 text-emerald-300 rounded-xl text-xs tabular-nums leading-relaxed overflow-x-auto max-h-56 border border-slate-800 shadow-inner">
                        {formattedMetadata}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400 text-xs">
                <Info size={24} className="mb-2 text-gray-300" />
                <span>Seleccione un registro de la tabla para ver su detalle de auditoría.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
