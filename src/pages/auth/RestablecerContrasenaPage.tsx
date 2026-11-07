import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/common/Button';
import { AlertBanner } from '@/components/common/AlertBanner';
import { Eye, EyeOff, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { AxiosError } from 'axios';

const resetPasswordSchema = z
  .object({
    nueva_contrasena: z
      .string()
      .min(1, 'La nueva contraseña es requerida')
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[a-zA-Z]/, 'La contraseña debe contener al menos una letra')
      .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
    confirmar_contrasena: z
      .string()
      .min(1, 'Debe confirmar su nueva contraseña'),
  })
  .refine((data) => data.nueva_contrasena === data.confirmar_contrasena, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmar_contrasena'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const RestablecerContrasenaPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token] = useState<string | null>(() => {
    const raw = searchParams.get('token');
    return raw ? raw.trim() : null;
  });

  const [isTokenInvalid, setIsTokenInvalid] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (searchParams.has('token')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('token');
      const query = newParams.toString();
      const cleanPath = `${window.location.pathname}${query ? `?${query}` : ''}`;
      window.history.replaceState({}, document.title, cleanPath);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!token) {
      setIsTokenInvalid(true);
    }
  }, [token]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      nueva_contrasena: '',
      confirmar_contrasena: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      setIsTokenInvalid(true);
      return;
    }

    setErrorMessage(null);
    try {
      const res = await authApi.restablecerContrasena({
        token,
        nueva_contrasena: data.nueva_contrasena,
      });

      navigate('/login', {
        replace: true,
        state: {
          aviso:
            res.message ||
            'Contraseña restablecida exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.',
        },
      });
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        if (!err.response || err.code === 'ERR_NETWORK') {
          setErrorMessage(
            'Error de red: No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.'
          );
          return;
        }

        const status = err.response.status;
        const detail = err.response.data?.detail || err.response.data?.message || '';

        if (
          status === 400 &&
          (typeof detail === 'string' &&
            (detail.toLowerCase().includes('inválido') ||
              detail.toLowerCase().includes('invalido') ||
              detail.toLowerCase().includes('expir') ||
              detail.toLowerCase().includes('token')))
        ) {
          setIsTokenInvalid(true);
        } else if (typeof detail === 'string' && detail) {
          setErrorMessage(detail);
        } else {
          setErrorMessage('Error al restablecer la contraseña. Intente nuevamente.');
        }
      } else {
        setErrorMessage('Ocurrió un error inesperado al procesar la solicitud.');
      }
    }
  };

  if (isTokenInvalid) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">
            Restablecer contraseña
          </h1>
        </div>

        <div className="p-6 rounded-xl border border-rose-200 bg-rose-50/50 space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle size={24} />
          </div>

          <div>
            <h2 className="text-base font-bold text-gray-900">
              El enlace no es válido o expiró
            </h2>
            <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
              Por motivos de seguridad, los enlaces para restablecer contraseñas expiran después de 30 minutos y solo pueden utilizarse una única vez.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/recuperar-acceso"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-brand-700 hover:bg-brand-800 text-white font-semibold text-xs transition-colors shadow-sm"
            >
              Solicitar otro enlace
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors"
          >
            <ArrowLeft size={14} />
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">
          Restablecer contraseña
        </h1>
        <p className="text-sm text-gray-500">
          Ingresa tu nueva contraseña para acceder a la plataforma.
        </p>
      </div>

      <div className="p-6 rounded-xl border border-gray-200/90 bg-white space-y-4">
        {errorMessage && <AlertBanner type="danger" message={errorMessage} />}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nueva contraseña"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            error={errors.nueva_contrasena?.message}
            rightIcon={
              showPassword ? (
                <EyeOff size={18} className="text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye size={18} className="text-gray-400 hover:text-gray-600" />
              )
            }
            onRightIconClick={() => setShowPassword(!showPassword)}
            {...register('nueva_contrasena')}
          />

          <Input
            label="Confirmar nueva contraseña"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            error={errors.confirmar_contrasena?.message}
            rightIcon={
              showConfirmPassword ? (
                <EyeOff size={18} className="text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye size={18} className="text-gray-400 hover:text-gray-600" />
              )
            }
            onRightIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
            {...register('confirmar_contrasena')}
          />

          <div className="p-3 bg-gray-50 rounded-lg text-[11px] text-gray-500 space-y-1">
            <p className="font-semibold text-gray-700">Requisitos de seguridad:</p>
            <ul className="list-disc list-inside space-y-0.5 text-gray-600">
              <li>Mínimo 8 caracteres</li>
              <li>Contener al menos una letra y un número</li>
            </ul>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full py-2.5"
              isLoading={isSubmitting}
              icon={<CheckCircle2 size={16} />}
            >
              Restablecer contraseña
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-6 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors"
        >
          <ArrowLeft size={14} />
          Volver a iniciar sesión
        </Link>
      </div>
    </div>
  );
};
