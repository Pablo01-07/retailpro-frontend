import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/common/Button';
import { AlertBanner, AlertBannerType } from '@/components/common/AlertBanner';
import { KeyRound, ArrowLeft } from 'lucide-react';
import { AxiosError } from 'axios';

const recoverySchema = z.object({
  email: z
    .string()
    .min(1, 'El correo electrónico es requerido')
    .email('Ingrese un formato de correo válido'),
});

type RecoveryFormValues = z.infer<typeof recoverySchema>;

interface BannerState {
  type: AlertBannerType;
  message: string;
}

export const PasswordRecoveryPage: React.FC = () => {
  const [banner, setBanner] = useState<BannerState | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecoveryFormValues>({
    resolver: zodResolver(recoverySchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: RecoveryFormValues) => {
    setBanner(null);
    try {
      const res = await authApi.solicitarRecuperacion(data.email);
      setBanner({
        type: 'success',
        message:
          res.message ||
          'Te enviamos las instrucciones al correo indicado. Revisa tu bandeja de entrada y spam.',
      });
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        if (!err.response || err.code === 'ERR_NETWORK') {
          setBanner({
            type: 'danger',
            message:
              'Error de red: No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.',
          });
          return;
        }

        const status = err.response.status;
        const apiDetail =
          typeof err.response.data?.detail === 'string'
            ? err.response.data.detail
            : typeof err.response.data?.message === 'string'
            ? err.response.data.message
            : null;

        if (status === 404) {
          setBanner({
            type: 'warning',
            message:
              apiDetail ||
              'No existe una cuenta registrada con ese correo electrónico.',
          });
        } else if (status === 403) {
          setBanner({
            type: 'danger',
            message:
              apiDetail ||
              'La cuenta está inactiva. Comunícate con el administrador.',
          });
        } else if (status === 429) {
          setBanner({
            type: 'warning',
            message:
              apiDetail ||
              'Ha superado el límite de solicitudes por hora para este correo. Intente más tarde.',
          });
        } else {
          setBanner({
            type: 'danger',
            message: apiDetail || 'Error al procesar la solicitud de recuperación.',
          });
        }
      } else {
        setBanner({
          type: 'danger',
          message:
            'Error de red: No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.',
        });
      }
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">
          Recuperación de acceso
        </h1>
      </div>

      <div className="p-6 rounded-xl border border-gray-200/90 bg-white space-y-4">
        <p className="text-xs text-gray-500 leading-relaxed">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        {banner && (
          <AlertBanner
            type={banner.type}
            message={banner.message}
          />
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Correo electrónico"
            type="email"
            placeholder="correo@empresa.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full py-2.5"
            isLoading={isSubmitting}
            icon={<KeyRound size={16} />}
          >
            Solicitar recuperación
          </Button>
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
