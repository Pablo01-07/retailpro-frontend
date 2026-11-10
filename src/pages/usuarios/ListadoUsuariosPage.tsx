import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, UserResponse, UserFilterParams } from '@/api/users';
import { formatDateLima } from '@/lib/formatters';
import { AlertBanner } from '@/components/common/AlertBanner';
import {
  Plus,
  Pencil,
  Power,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react';

export const ListadoUsuariosPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedRol, setSelectedRol] = useState<string>('Todos');
  const [selectedEstado, setSelectedEstado] = useState<string>('Todos');
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;
  const [actionBanner, setActionBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const { data: rolesData } = useQuery({
    queryKey: ['usuarios-roles'],
    queryFn: () => usersApi.getRoles(),
    staleTime: 60000,
  });

  const filterParams: UserFilterParams = {
    page,
    size: pageSize,
    rol: selectedRol !== 'Todos' ? selectedRol : undefined,
    estado: selectedEstado === 'Activo' ? true : selectedEstado === 'Inactivo' ? false : undefined,
  };

  const {
    data: usersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['usuarios-list', filterParams],
    queryFn: () => usersApi.listUsers(filterParams),
    staleTime: 15000,
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: number) => usersApi.deactivateUser(userId),
    onSuccess: (u) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-list'] });
      setErrorBanner(null);
      setActionBanner(`La cuenta de ${u.nombre_completo} ha sido desactivada.`);
      setTimeout(() => setActionBanner(null), 5000);
    },
    onError: (err: any) => {
      setErrorBanner(err.response?.data?.detail || 'No se pudo desactivar el usuario.');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (userId: number) => usersApi.updateUser(userId, { estado: true }),
    onSuccess: (u) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-list'] });
      setErrorBanner(null);
      setActionBanner(`La cuenta de ${u.nombre_completo} ha sido reactivada exitosamente.`);
      setTimeout(() => setActionBanner(null), 5000);
    },
    onError: (err: any) => {
      setErrorBanner(err.response?.data?.detail || 'No se pudo reactivar el usuario.');
    },
  });

  const handleToggleStatus = (u: UserResponse) => {
    if (u.estado) {
      if (confirm(`¿Está seguro de desactivar la cuenta de ${u.nombre_completo}?`)) {
        deactivateMutation.mutate(u.id_usuario);
      }
    } else {
      reactivateMutation.mutate(u.id_usuario);
    }
  };

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Listado y administración de usuarios
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestione las identidades, roles asignados y el estado de accesos en el sistema
        </p>
      </div>

      {errorBanner && (
        <AlertBanner
          type="danger"
          message={errorBanner}
          onClose={() => setErrorBanner(null)}
        />
      )}

      {actionBanner && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{actionBanner}</span>
          </div>
          <button onClick={() => setActionBanner(null)} className="text-emerald-600 hover:text-emerald-800">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-card border border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Rol:</span>
            <div className="relative">
              <select
                value={selectedRol}
                onChange={(e) => {
                  setSelectedRol(e.target.value);
                  setPage(1);
                }}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-1.5 pr-8 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm cursor-pointer min-w-[130px]"
              >
                <option value="Todos">Todos</option>
                {(rolesData || []).map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Estado:</span>
            <div className="relative">
              <select
                value={selectedEstado}
                onChange={(e) => {
                  setSelectedEstado(e.target.value);
                  setPage(1);
                }}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-1.5 pr-8 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700 shadow-sm cursor-pointer min-w-[110px]"
              >
                <option value="Todos">Todos</option>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/usuarios/nuevo')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
        >
          <Plus size={16} />
          <span>Crear usuario</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3">
            <Loader2 className="animate-spin text-brand-700" size={32} />
            <p className="text-xs text-gray-500">Cargando cuentas de usuario...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm">
            Error al consultar el listado de usuarios.
          </div>
        ) : (usersData?.items || []).length === 0 ? (
          <div className="p-16 text-center text-gray-400 text-sm">
            No se encontraron usuarios para los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/60 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Nombre completo</th>
                  <th className="py-3 px-5">Correo electrónico</th>
                  <th className="py-3 px-5 text-center">Rol</th>
                  <th className="py-3 px-5 text-center">Estado</th>
                  <th className="py-3 px-5 text-center">Fecha de creación</th>
                  <th className="py-3 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
                {usersData?.items.map((u) => {
                  return (
                    <tr key={u.id_usuario} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-gray-900">
                        {u.nombre_completo}
                      </td>
                      <td className="py-3.5 px-5 text-gray-600">
                        {u.correo}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        {u.rol === 'administrador' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Administrador
                          </span>
                        )}
                        {u.rol === 'analista' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Analista de Inventarios
                          </span>
                        )}
                        {u.rol === 'jefe_logistica' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Jefe de Logística
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        {u.estado ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600">
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-center text-gray-500 tabular-nums">
                        {formatDateLima(u.fecha_creacion || u.creado_en)}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/usuarios/${u.id_usuario}`)}
                            title="Editar usuario"
                            className="p-1.5 text-gray-500 hover:text-brand-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            title={u.estado ? 'Desactivar usuario' : 'Reactivar usuario'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.estado
                                ? 'text-gray-500 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            <Power size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {usersData && usersData.total > 0 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Mostrando {Math.min((page - 1) * pageSize + 1, usersData.total)} -{' '}
              {Math.min(page * pageSize, usersData.total)} de {usersData.total} usuarios
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: usersData.pages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setPage(idx + 1)}
                  className={`w-7 h-7 rounded-lg font-semibold ${
                    page === idx + 1
                      ? 'bg-brand-700 text-white'
                      : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(usersData.pages, p + 1))}
                disabled={page >= usersData.pages}
                className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
