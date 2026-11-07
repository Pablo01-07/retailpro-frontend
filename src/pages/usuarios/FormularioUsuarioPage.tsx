import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, RoleOption } from '@/api/users';
import { RoleCode } from '@/types';
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

export const FormularioUsuarioPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const userId = id ? Number(id) : undefined;

  const [nombreCompleto, setNombreCompleto] = useState('');
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState<RoleCode>('analista');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [estado, setEstado] = useState(true);

  const [errors, setErrors] = useState<{
    nombreCompleto?: string;
    correo?: string;
    rol?: string;
    password?: string;
    general?: string;
  }>({});

  const { data: rolesData, isLoading: loadingRoles } = useQuery<RoleOption[]>({
    queryKey: ['usuarios-roles'],
    queryFn: () => usersApi.getRoles(),
    staleTime: 60000,
  });

  const { data: userData, isLoading: loadingUser } = useQuery({
    queryKey: ['usuario-detail', userId],
    queryFn: () => usersApi.getUser(userId!),
    enabled: isEdit && !isNaN(Number(userId)),
    staleTime: 10000,
  });

  useEffect(() => {
    if (userData) {
      setNombreCompleto(userData.nombre_completo);
      setCorreo(userData.correo);
      setRol(userData.rol);
      setEstado(userData.estado);
    }
  }, [userData]);

  const createMutation = useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-list'] });
      navigate('/usuarios');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Error al crear el usuario. Verifique los datos.';
      setErrors((prev) => ({ ...prev, general: msg }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { userId: number; payload: any }) =>
      usersApi.updateUser(data.userId, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-list'] });
      navigate('/usuarios');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Error al actualizar el usuario.';
      setErrors((prev) => ({ ...prev, general: msg }));
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!nombreCompleto.trim()) {
      newErrors.nombreCompleto = 'Este campo es requerido.';
    }

    if (!correo.trim()) {
      newErrors.correo = 'El correo electrónico es requerido.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      newErrors.correo = 'Ingrese un formato de correo válido.';
    }

    if (!rol) {
      newErrors.rol = 'Debe seleccionar un rol para el usuario.';
    }

    if (!isEdit) {
      if (!password) {
        newErrors.password = 'La contraseña es requerida para nuevos usuarios.';
      } else if (password.length < 8) {
        newErrors.password = 'La contraseña debe tener al menos 8 caracteres.';
      }
    } else if (password && password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres si desea modificarla.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (isEdit && userId) {
      updateMutation.mutate({
        userId,
        payload: {
          nombre_completo: nombreCompleto.trim(),
          correo: correo.trim(),
          rol,
          estado,
          ...(password ? { password } : {}),
        },
      });
    } else {
      createMutation.mutate({
        nombre_completo: nombreCompleto.trim(),
        correo: correo.trim(),
        rol,
        estado,
        password,
      });
    }
  };

  if (isEdit && loadingUser) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-3">
        <Loader2 size={32} className="animate-spin text-brand-700" />
        <span className="text-sm text-gray-500 font-medium">Cargando datos del usuario...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <nav className="flex items-center gap-2 text-xs text-gray-500 font-medium">
        <Link to="/usuarios" className="hover:text-brand-700 transition-colors">
          Usuarios
        </Link>
        <span>&gt;</span>
        <span className="text-gray-900 font-semibold">
          {isEdit ? 'Editar usuario' : 'Crear usuario'}
        </span>
      </nav>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/usuarios')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Volver a usuarios"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          {isEdit ? 'Editar usuario' : 'Crear nuevo usuario'}
        </h1>
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-card border border-gray-100">
        <div className="mb-6 pb-6 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Información del usuario</h2>
          <p className="text-xs text-gray-500 mt-1">
            {isEdit
              ? 'Actualice los datos y permisos de la cuenta autorizada en la plataforma.'
              : 'Complete los campos para registrar una cuenta autorizada dentro de la plataforma corporativa.'}
          </p>
        </div>

        {errors.general && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs">
            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">No se pudo procesar la solicitud</p>
              <p className="mt-0.5">{errors.general}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombreCompleto}
              onChange={(e) => {
                setNombreCompleto(e.target.value);
                if (errors.nombreCompleto) setErrors((prev) => ({ ...prev, nombreCompleto: undefined }));
              }}
              placeholder="Nombres y apellidos"
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all ${
                errors.nombreCompleto
                  ? 'border-red-500 focus:ring-red-400 bg-red-50/20'
                  : 'border-gray-200 focus:ring-brand-700/30 focus:border-brand-700'
              }`}
            />
            {errors.nombreCompleto && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.nombreCompleto}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Correo electrónico <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={correo}
              onChange={(e) => {
                setCorreo(e.target.value);
                if (errors.correo) setErrors((prev) => ({ ...prev, correo: undefined }));
              }}
              placeholder="correo@empresa.com"
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all ${
                errors.correo
                  ? 'border-red-500 focus:ring-red-400 bg-red-50/20'
                  : 'border-gray-200 focus:ring-brand-700/30 focus:border-brand-700'
              }`}
            />
            {errors.correo && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.correo}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Rol asignado <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={rol}
                onChange={(e) => {
                  setRol(e.target.value as RoleCode);
                  if (errors.rol) setErrors((prev) => ({ ...prev, rol: undefined }));
                }}
                disabled={loadingRoles}
                className="w-full appearance-none px-3.5 py-2.5 pr-10 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-700/30 focus:border-brand-700 transition-all cursor-pointer text-gray-800"
              >
                {rolesData?.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
            {errors.rol && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.rol}</p>
            )}
            {rolesData && (
              <p className="text-[11px] text-gray-500 mt-1.5">
                {rolesData.find((r) => r.code === rol)?.description}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-700">
                {isEdit ? 'Nueva contraseña' : 'Contraseña'}{' '}
                {!isEdit && <span className="text-red-500">*</span>}
              </label>
              {isEdit && (
                <span className="text-[11px] text-gray-400 font-normal">
                  Dejar en blanco para conservar la actual
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder={isEdit ? '••••••••' : 'Mínimo 8 caracteres'}
                className={`w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all ${
                  errors.password
                    ? 'border-red-500 focus:ring-red-400 bg-red-50/20'
                    : 'border-gray-200 focus:ring-brand-700/30 focus:border-brand-700'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.password}</p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between gap-4">
            <div>
              <span className="block text-xs font-semibold text-gray-900">Estado de la cuenta</span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Defina si el usuario podrá iniciar sesión inmediatamente.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={estado}
              onClick={() => setEstado(!estado)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-2 ${
                estado ? 'bg-brand-700' : 'bg-gray-300'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  estado ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/usuarios')}
              disabled={isSaving}
              className="px-5 py-2.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              <span>{isEdit ? 'Guardar cambios' : 'Guardar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
