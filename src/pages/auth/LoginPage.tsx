import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/common/Button';
import { AlertBanner } from '@/components/common/AlertBanner';
import { Eye, EyeOff } from 'lucide-react';
import { AxiosError } from 'axios';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo electrónico es requerido')
    .email('Ingrese un formato de correo válido'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
  const aviso =
    (location.state as { aviso?: string; message?: string })?.aviso ||
    (location.state as { aviso?: string; message?: string })?.message;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setErrorMessage(null);
    try {
      await login({
        email: data.email,
        password: data.password,
      });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        const errorDetail = err.response?.data?.message || err.response?.data?.detail;
        if (typeof errorDetail === 'string') {
          setErrorMessage(errorDetail);
        } else if (err.response?.status === 403) {
          setErrorMessage(
            'Ha superado el número máximo de intentos fallidos. Su cuenta ha sido bloqueada temporalmente.'
          );
        } else if (err.response?.status === 401) {
          setErrorMessage('Correo electrónico o contraseña incorrectos.');
        } else {
          setErrorMessage('Error al conectar con el servidor. Verifique que la API esté activa.');
        }
      } else {
        setErrorMessage('Ocurrió un error inesperado al intentar iniciar sesión.');
      }
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1.5">
          Iniciar sesión
        </h1>
        <p className="text-sm text-gray-500">
          Accede a la consola de pronósticos y control de inventarios.
        </p>
      </div>

      {aviso && !errorMessage && (
        <div className="mb-5">
          <AlertBanner type="success" message={aviso} />
        </div>
      )}

      {errorMessage && (
        <div className="mb-5">
          <AlertBanner type="danger" message={errorMessage} />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Correo electrónico"
          type="email"
          placeholder="correo@empresa.com"
          required
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Contraseña"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          required
          autoComplete="current-password"
          error={errors.password?.message}
          rightIcon={
            showPassword ? (
              <EyeOff size={18} className="text-gray-400 hover:text-gray-600" />
            ) : (
              <Eye size={18} className="text-gray-400 hover:text-gray-600" />
            )
          }
          onRightIconClick={() => setShowPassword(!showPassword)}
          {...register('password')}
        />

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-brand-700 focus:ring-brand-700"
              {...register('rememberMe')}
            />
            <span className="text-xs text-gray-600 font-medium">Recordarme</span>
          </label>

          <Link
            to="/recuperar-acceso"
            className="text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full py-2.5"
            isLoading={isSubmitting}
          >
            Iniciar sesión
          </Button>
        </div>
      </form>
    </div>
  );
};
