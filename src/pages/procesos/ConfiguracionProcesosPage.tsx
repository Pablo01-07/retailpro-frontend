import React, { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  processesApi,
  ProcesoConfigSchema,
  ProcesoConfigItemResponse,
  ProcesoConfigPatchRequest,
} from '@/api/processes';
import { notificationsApi } from '@/api/notifications';
import { thresholdsApi } from '@/api/thresholds';
import { Button } from '@/components/common/Button';
import { AlertBanner } from '@/components/common/AlertBanner';
import { formatDateTimeLima } from '@/lib/formatters';
import {
  Save,
  RotateCcw,
  Settings,
  Play,
  X,
  Calendar,
  Clock,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Send,
} from 'lucide-react';
import { AxiosError } from 'axios';

const DIAS_SEMANA = [
  { value: 0, label: 'Lunes' },
  { value: 1, label: 'Martes' },
  { value: 2, label: 'Miércoles' },
  { value: 3, label: 'Jueves' },
  { value: 4, label: 'Viernes' },
  { value: 5, label: 'Sábado' },
  { value: 6, label: 'Domingo' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmails(input: string): { isValid: boolean; error?: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Debe ingresar al menos un correo de notificación.' };
  }
  const parts = trimmed.split(',').map((p) => p.trim()).filter((p) => p.length > 0);
  if (parts.length === 0) {
    return { isValid: false, error: 'Debe ingresar al menos un correo de notificación.' };
  }
  for (const part of parts) {
    if (!EMAIL_REGEX.test(part)) {
      return { isValid: false, error: `El correo "${part}" no tiene un formato válido.` };
    }
  }
  return { isValid: true };
}

const getDiaLabel = (diaSemana?: number | null, diaNombre?: string | null): string => {
  if (diaNombre) {
    return diaNombre.charAt(0).toUpperCase() + diaNombre.slice(1).toLowerCase();
  }
  if (diaSemana !== undefined && diaSemana !== null) {
    const found = DIAS_SEMANA.find((d) => d.value === diaSemana);
    if (found) return found.label;
  }
  return 'Domingo';
};

export const ConfiguracionProcesosPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [togglingProcesoId, setTogglingProcesoId] = useState<string | null>(null);

  const [modalProceso, setModalProceso] = useState<ProcesoConfigItemResponse | null>(null);
  const [modalFrecuencia, setModalFrecuencia] = useState<string>('diario');
  const [modalHora, setModalHora] = useState<string>('00:00');
  const [modalDiaSemana, setModalDiaSemana] = useState<number>(6);
  const [modalMsg, setModalMsg] = useState<{
    type: 'success' | 'danger' | 'warning';
    message: string;
  } | null>(null);
  const [confirmEjecutar, setConfirmEjecutar] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isSavingModal, setIsSavingModal] = useState<boolean>(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSendingResumen, setIsSendingResumen] = useState<boolean>(false);
  const [resumenBanner, setResumenBanner] = useState<{
    type: 'success' | 'warning' | 'danger';
    message: string;
  } | null>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ['configuracion-procesos'],
    queryFn: () => processesApi.getConfiguracion(),
  });

  const { data: umbralesData } = useQuery({
    queryKey: ['umbrales-configuracion'],
    queryFn: () => thresholdsApi.getUmbrales(),
  });

  const [formData, setFormData] = useState<ProcesoConfigSchema>({
    etl_frecuencia: 'diario',
    etl_hora: '02:00',
    pronostico_frecuencia: 'diario',
    pronostico_hora: '04:00',
    reentrenamiento_frecuencia: 'semanal',
    reentrenamiento_dia: 'domingo',
    reentrenamiento_hora: '01:00',
    alertas_notificacion_email: '',
    correo_alertas: '',
    notificar_quiebre: true,
    quiebre_critico: true,
    notificar_sobrestock: true,
    sobrestock_prolongado: true,
    notificar_calidad_baja: true,
    calidad_bajo_umbral: true,
    umbral_calidad: 90,
    calidad_min: 90,
  });

  useEffect(() => {
    if (config) {
      const emailVal = config.alertas_notificacion_email || config.correo_alertas || '';
      const umbralVal =
        config.umbral_calidad ??
        config.calidad_min ??
        umbralesData?.umbrales?.find((u) => u.tipo_umbral === 'calidad_min')?.valor ??
        90;

      setFormData({
        ...config,
        alertas_notificacion_email: emailVal,
        correo_alertas: emailVal,
        notificar_quiebre: config.notificar_quiebre ?? config.quiebre_critico ?? true,
        quiebre_critico: config.quiebre_critico ?? config.notificar_quiebre ?? true,
        notificar_sobrestock: config.notificar_sobrestock ?? config.sobrestock_prolongado ?? true,
        sobrestock_prolongado: config.sobrestock_prolongado ?? config.notificar_sobrestock ?? true,
        notificar_calidad_baja: config.notificar_calidad_baja ?? config.calidad_bajo_umbral ?? true,
        calidad_bajo_umbral: config.calidad_bajo_umbral ?? config.notificar_calidad_baja ?? true,
        umbral_calidad: umbralVal,
        calidad_min: umbralVal,
      });
      setEmailError(null);
    }
  }, [config, umbralesData]);

  const procesosList: ProcesoConfigItemResponse[] = useMemo(() => {
    if (!config) return [];
    if (config.procesos && config.procesos.length > 0) {
      return config.procesos;
    }
    return [
      {
        id_proceso: 'etl_diario',
        nombre: 'Actualización y validación ETL',
        tipo: 'Extracción y Calidad',
        activo: config.etl_activo ?? true,
        frecuencia: config.etl_frecuencia || 'diario',
        hora: config.etl_hora || '02:00',
        dia_semana: config.etl_dia_semana,
        dia: config.etl_dia,
        proxima_ejecucion: config.etl_proxima_ejecucion,
      },
      {
        id_proceso: 'pronostico_diario',
        nombre: 'Generación de pronósticos auto',
        tipo: 'Inferencia XGBoost',
        activo: config.pronostico_activo ?? true,
        frecuencia: config.pronostico_frecuencia || 'diario',
        hora: config.pronostico_hora || '04:00',
        dia_semana: config.pronostico_dia_semana,
        dia: config.pronostico_dia,
        proxima_ejecucion: config.pronostico_proxima_ejecucion,
      },
      {
        id_proceso: 'reentrenamiento_semanal',
        nombre: 'Entrenamiento del modelo XGBoost',
        tipo: 'Entrenamiento XGBoost',
        activo: config.reentrenamiento_activo ?? true,
        frecuencia: config.reentrenamiento_frecuencia || 'semanal',
        hora: config.reentrenamiento_hora || '01:00',
        dia_semana: config.reentrenamiento_dia_semana ?? 6,
        dia: config.reentrenamiento_dia || 'domingo',
        proxima_ejecucion: config.reentrenamiento_proxima_ejecucion,
      },
    ];
  }, [config]);

  const toggleEstadoMutation = useMutation({
    mutationFn: async ({ procesoId, activo }: { procesoId: string; activo: boolean }) => {
      setTogglingProcesoId(procesoId);
      return await processesApi.patchConfiguracionProceso(procesoId, { activo });
    },
    onSuccess: (updated) => {
      setSuccessMsg(`Estado de "${updated.nombre}" actualizado a ${updated.activo ? 'activo' : 'inactivo'}.`);
      setErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ['configuracion-procesos'] });
      queryClient.invalidateQueries({ queryKey: ['procesos-batch'] });
    },
    onError: (err: unknown, variables) => {
      let msg = 'Error al cambiar el estado del proceso en el servidor.';
      if (err instanceof AxiosError) {
        msg = err.response?.data?.detail || err.response?.data?.message || err.message;
      }
      setErrorMsg(`No se pudo cambiar el estado de "${variables.procesoId}": ${msg}`);
      queryClient.invalidateQueries({ queryKey: ['configuracion-procesos'] });
    },
    onSettled: () => {
      setTogglingProcesoId(null);
    },
  });

  const handleToggleEstado = (proceso: ProcesoConfigItemResponse) => {
    if (togglingProcesoId !== null) return;
    toggleEstadoMutation.mutate({
      procesoId: proceso.id_proceso,
      activo: !proceso.activo,
    });
  };

  const handleOpenModal = (proceso: ProcesoConfigItemResponse) => {
    setModalProceso(proceso);
    setModalFrecuencia(proceso.frecuencia?.toLowerCase() || 'diario');
    setModalHora(proceso.hora || '00:00');
    setModalDiaSemana(
      proceso.dia_semana !== undefined && proceso.dia_semana !== null
        ? proceso.dia_semana
        : 6
    );
    setModalMsg(null);
    setConfirmEjecutar(false);
  };

  const handleCloseModal = () => {
    if (isSavingModal || isExecuting) return;
    setModalProceso(null);
    setModalMsg(null);
    setConfirmEjecutar(false);
  };

  const handleGuardarModal = async () => {
    if (!modalProceso) return;
    setIsSavingModal(true);
    setModalMsg(null);

    const patchPayload: ProcesoConfigPatchRequest = {
      frecuencia: modalFrecuencia,
      hora: modalHora,
      ...(modalFrecuencia === 'semanal' ? { dia_semana: Number(modalDiaSemana) } : {}),
    };

    try {
      const updated = await processesApi.patchConfiguracionProceso(modalProceso.id_proceso, patchPayload);
      queryClient.invalidateQueries({ queryKey: ['configuracion-procesos'] });
      queryClient.invalidateQueries({ queryKey: ['procesos-batch'] });
      setSuccessMsg(`Configuración de "${updated.nombre}" guardada con éxito y Scheduler reprogramado.`);
      setModalProceso(null);
    } catch (err: unknown) {
      let msg = 'Ocurrió un error al guardar la configuración.';
      if (err instanceof AxiosError) {
        msg = err.response?.data?.detail || err.response?.data?.message || err.message;
      }
      setModalMsg({ type: 'danger', message: msg });
    } finally {
      setIsSavingModal(false);
    }
  };

  const handleEjecutarProceso = async () => {
    if (!modalProceso) return;
    setIsExecuting(true);
    setModalMsg(null);

    try {
      const res = await processesApi.ejecutarProceso(modalProceso.id_proceso);
      const okMsg = res.mensaje || `Proceso "${modalProceso.nombre}" ejecutado correctamente.`;
      setModalMsg({ type: 'success', message: okMsg });
      queryClient.invalidateQueries({ queryKey: ['configuracion-procesos'] });
      queryClient.invalidateQueries({ queryKey: ['procesos-batch'] });
      setConfirmEjecutar(false);
    } catch (err: unknown) {
      let msg = 'Error al ejecutar el proceso batch de forma manual.';
      if (err instanceof AxiosError) {
        msg = err.response?.data?.detail || err.response?.data?.message || err.message;
      }
      setModalMsg({ type: 'danger', message: msg });
      setConfirmEjecutar(false);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleEmailChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      alertas_notificacion_email: val,
      correo_alertas: val,
    }));
    if (emailError) {
      const valRes = validateEmails(val);
      if (valRes.isValid) {
        setEmailError(null);
      }
    }
  };

  const handleEnviarResumenAlertas = async () => {
    const rawEmails = formData.alertas_notificacion_email || '';
    const validation = validateEmails(rawEmails);
    if (!validation.isValid) {
      setEmailError(validation.error || 'Correo inválido.');
      return;
    }
    setEmailError(null);
    setIsSendingResumen(true);
    setResumenBanner(null);

    try {
      const res = await notificationsApi.enviarResumenAlertas(rawEmails);
      if (res.enviado) {
        const destStr = res.destinatarios && res.destinatarios.length > 0
          ? res.destinatarios.join(', ')
          : rawEmails;
        setResumenBanner({
          type: 'success',
          message: `${res.message} (${res.cantidad_alertas} alerta(s) enviada(s) a ${destStr}).`,
        });
      } else if (!res.enviado && res.success) {
        setResumenBanner({
          type: 'warning',
          message: res.message || 'No hay alertas activas de los tipos seleccionados para enviar.',
        });
      } else {
        setResumenBanner({
          type: 'danger',
          message: res.message || 'Error al enviar el resumen de alertas.',
        });
      }
    } catch (err: unknown) {
      let msg = 'Error al conectar con el servicio de notificación de alertas.';
      if (err instanceof AxiosError) {
        msg = err.response?.data?.detail || err.response?.data?.message || err.message;
      }
      setResumenBanner({
        type: 'danger',
        message: msg,
      });
    } finally {
      setIsSendingResumen(false);
    }
  };

  const updateNotificacionesMutation = useMutation({
    mutationFn: (updated: ProcesoConfigSchema) => processesApi.updateConfiguracion(updated),
    onSuccess: (saved) => {
      setSuccessMsg('Notificaciones y umbrales guardados con éxito.');
      setErrorMsg(null);
      setEmailError(null);
      setResumenBanner(null);
      queryClient.invalidateQueries({ queryKey: ['configuracion-procesos'] });
      queryClient.invalidateQueries({ queryKey: ['umbrales-configuracion'] });
      queryClient.invalidateQueries({ queryKey: ['procesos-batch'] });

      if (saved) {
        const emailVal = saved.alertas_notificacion_email || saved.correo_alertas || '';
        const umbralVal = saved.umbral_calidad ?? saved.calidad_min ?? 90;
        setFormData({
          ...saved,
          alertas_notificacion_email: emailVal,
          correo_alertas: emailVal,
          notificar_quiebre: saved.notificar_quiebre ?? saved.quiebre_critico ?? true,
          quiebre_critico: saved.quiebre_critico ?? saved.notificar_quiebre ?? true,
          notificar_sobrestock: saved.notificar_sobrestock ?? saved.sobrestock_prolongado ?? true,
          sobrestock_prolongado: saved.sobrestock_prolongado ?? saved.notificar_sobrestock ?? true,
          notificar_calidad_baja: saved.notificar_calidad_baja ?? saved.calidad_bajo_umbral ?? true,
          calidad_bajo_umbral: saved.calidad_bajo_umbral ?? saved.notificar_calidad_baja ?? true,
          umbral_calidad: umbralVal,
          calidad_min: umbralVal,
        });
      }
    },
    onError: (err: unknown) => {
      let msg = 'Error al guardar las notificaciones.';
      if (err instanceof AxiosError) {
        msg = err.response?.data?.detail || err.response?.data?.message || err.message;
      }
      setErrorMsg(msg);
    },
  });

  const handleSaveNotificaciones = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateEmails(formData.alertas_notificacion_email || '');
    if (!validation.isValid) {
      setEmailError(validation.error || 'Correo inválido.');
      return;
    }
    setEmailError(null);

    const umbralNum = Number(formData.umbral_calidad ?? 90);
    if (isNaN(umbralNum) || umbralNum < 50 || umbralNum > 100) {
      setErrorMsg('El umbral de calidad debe estar entre 50% y 100%.');
      return;
    }

    updateNotificacionesMutation.mutate({
      ...formData,
      umbral_calidad: umbralNum,
      calidad_min: umbralNum,
      correo_alertas: formData.alertas_notificacion_email,
      quiebre_critico: formData.notificar_quiebre,
      calidad_bajo_umbral: formData.notificar_calidad_baja,
      sobrestock_prolongado: formData.notificar_sobrestock,
    });
  };

  const handleCancelNotificaciones = () => {
    if (config) {
      const emailVal = config.alertas_notificacion_email || config.correo_alertas || '';
      const umbralVal =
        config.umbral_calidad ??
        config.calidad_min ??
        umbralesData?.umbrales?.find((u) => u.tipo_umbral === 'calidad_min')?.valor ??
        90;

      setFormData({
        ...config,
        alertas_notificacion_email: emailVal,
        correo_alertas: emailVal,
        notificar_quiebre: config.notificar_quiebre ?? config.quiebre_critico ?? true,
        quiebre_critico: config.quiebre_critico ?? config.notificar_quiebre ?? true,
        notificar_sobrestock: config.notificar_sobrestock ?? config.sobrestock_prolongado ?? true,
        sobrestock_prolongado: config.sobrestock_prolongado ?? config.notificar_sobrestock ?? true,
        notificar_calidad_baja: config.notificar_calidad_baja ?? config.calidad_bajo_umbral ?? true,
        calidad_bajo_umbral: config.calidad_bajo_umbral ?? config.notificar_calidad_baja ?? true,
        umbral_calidad: umbralVal,
        calidad_min: umbralVal,
      });
      setEmailError(null);
      setErrorMsg(null);
      setResumenBanner(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6 border-b border-gray-200 text-sm font-medium">
        <NavLink
          to="/procesos"
          end
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Monitoreo de Procesos
        </NavLink>
        <NavLink
          to="/procesos/configuracion"
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Configuración de Procesos
        </NavLink>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Configuración de procesos y notificaciones
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestione el programador de tareas automáticas y reglas de alerta para la calidad de datos.
        </p>
      </div>

      {successMsg && (
        <AlertBanner type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />
      )}

      {errorMsg && (
        <AlertBanner type="danger" message={errorMsg} onClose={() => setErrorMsg(null)} />
      )}

      {isLoading ? (
        <div className="p-12 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-brand-700" />
          <span>Cargando configuración de procesos...</span>
        </div>
      ) : (
        <form onSubmit={handleSaveNotificaciones} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          <div className="lg:col-span-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-base font-bold text-gray-900">Procesos programados</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Mostrando {procesosList.length} de {procesosList.length} procesos configurables
                </p>
              </div>
              <span className="text-xs text-gray-500">
                La frecuencia y horario se editan mediante el botón Configurar.
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/75 border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Proceso</th>
                    <th className="py-3 px-4">Frecuencia</th>
                    <th className="py-3 px-4">Horario</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {procesosList.map((p) => {
                    const isToggling = togglingProcesoId === p.id_proceso;
                    const frecLower = (p.frecuencia || '').toLowerCase();
                    const frecDisplay =
                      frecLower === 'semanal'
                        ? `Semanal (${getDiaLabel(p.dia_semana, p.dia)})`
                        : frecLower.charAt(0).toUpperCase() + frecLower.slice(1);

                    return (
                      <tr key={p.id_proceso} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-bold text-gray-900">{p.nombre}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{p.tipo}</div>
                        </td>

                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                            <Calendar size={13} className="text-gray-500" />
                            {frecDisplay || 'Diario'}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-800 rounded-md text-xs font-mono">
                            <Clock size={13} className="text-gray-400" />
                            {p.hora || '00:00'}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={p.activo}
                            disabled={isToggling}
                            onClick={() => handleToggleEstado(p)}
                            title={p.activo ? 'Clic para pausar proceso' : 'Clic para activar proceso'}
                            className={`inline-flex items-center relative w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700/30 ${
                              p.activo ? 'bg-emerald-600' : 'bg-gray-300'
                            } ${isToggling ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                          >
                            <span
                              className={`inline-block w-4 h-4 rounded-full bg-white shadow transform transition-transform flex items-center justify-center ${
                                p.activo ? 'translate-x-5' : 'translate-x-0.5'
                              }`}
                            >
                              {isToggling && (
                                <Loader2 className="w-2.5 h-2.5 animate-spin text-gray-600" />
                              )}
                            </span>
                          </button>
                        </td>

                        <td className="py-4 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenModal(p)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:text-brand-900 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Settings size={14} />
                            Configurar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-gray-900">Notificaciones y umbrales</h2>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Umbral de calidad de datos
                </label>
                <span className="text-[11px] text-gray-500">Mínimo: 50% - 100%</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="50"
                  max="100"
                  step="0.5"
                  value={formData.umbral_calidad ?? 90}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setFormData((prev) => ({
                      ...prev,
                      umbral_calidad: isNaN(val) ? 90 : val,
                      calidad_min: isNaN(val) ? 90 : val,
                    }));
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-brand-700/40 pr-10"
                />
                <span className="absolute right-3.5 top-2.5 text-sm font-bold text-gray-500 pointer-events-none">
                  %
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 leading-normal">
                Las cargas con calidad inferior enviarán una alerta urgente.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Correo de alertas
                </label>
                <span className="text-[10px] text-gray-400">Separar múltiples con coma</span>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.alertas_notificacion_email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="correo1@empresa.com, correo2@empresa.com"
                  className={`w-full px-3.5 py-2 bg-white border rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-700/40 ${
                    emailError ? 'border-rose-400 focus:ring-rose-300' : 'border-gray-300'
                  }`}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs py-2"
                  onClick={handleEnviarResumenAlertas}
                  isLoading={isSendingResumen}
                  icon={<Send size={13} />}
                >
                  Enviar resumen de alertas ahora
                </Button>
              </div>

              {emailError && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{emailError}</p>
              )}

              {resumenBanner && (
                <div className="mt-2">
                  <AlertBanner
                    type={resumenBanner.type}
                    message={resumenBanner.message}
                    onClose={() => setResumenBanner(null)}
                  />
                </div>
              )}

              {config?.smtp_configurado === false && (
                <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-[11px] text-amber-800 leading-normal">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
                  <span>El servidor de correo no está configurado; los correos no se enviarán.</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Tipos de notificación
              </label>
              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.notificar_quiebre)}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notificar_quiebre: e.target.checked,
                        quiebre_critico: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded text-brand-700 focus:ring-brand-700"
                  />
                  <span className="text-xs text-gray-700">Riesgo de quiebre crítico</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.notificar_calidad_baja)}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notificar_calidad_baja: e.target.checked,
                        calidad_bajo_umbral: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded text-brand-700 focus:ring-brand-700"
                  />
                  <span className="text-xs text-gray-700">Calidad bajo umbral</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.notificar_sobrestock)}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notificar_sobrestock: e.target.checked,
                        sobrestock_prolongado: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded text-brand-700 focus:ring-brand-700"
                  />
                  <span className="text-xs text-gray-700">Alerta de sobrestock prolongado</span>
                </label>
              </div>
            </div>

            <div className="pt-3 flex items-center gap-3">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="flex-1"
                isLoading={updateNotificacionesMutation.isPending}
                icon={<Save size={16} />}
              >
                Guardar
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleCancelNotificaciones}
                icon={<RotateCcw size={15} />}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </form>
      )}

      {modalProceso && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-scale-in">

            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center">
                  <Settings size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">{modalProceso.nombre}</h3>
                  <span className="text-xs text-gray-500">{modalProceso.tipo}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSavingModal || isExecuting}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {modalMsg && (
              <AlertBanner
                type={modalMsg.type}
                message={modalMsg.message}
                onClose={() => setModalMsg(null)}
              />
            )}

            <div className="space-y-4 text-xs">

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Frecuencia de ejecución
                </label>
                <select
                  value={modalFrecuencia}
                  onChange={(e) => setModalFrecuencia(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-700/40"
                >
                  <option value="diario">Diario</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensual">Mensual</option>
                </select>
              </div>

              {modalFrecuencia === 'semanal' && (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Día de la semana
                  </label>
                  <select
                    value={modalDiaSemana}
                    onChange={(e) => setModalDiaSemana(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-700/40"
                  >
                    {DIAS_SEMANA.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Hora de ejecución (formato 24h)
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={modalHora}
                    onChange={(e) => setModalHora(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-700/40"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                  Próxima ejecución (Scheduler)
                </span>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                  <Calendar size={16} className="text-brand-700 shrink-0" />
                  <span>
                    {modalProceso.proxima_ejecucion
                      ? formatDateTimeLima(modalProceso.proxima_ejecucion)
                      : modalProceso.activo
                      ? 'Pendiente de cálculo'
                      : 'No programada (proceso pausado o inactivo)'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 pt-0.5">
                  Valor calculado en tiempo real por el planificador del backend.
                </p>
              </div>

              {confirmEjecutar && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-start gap-2 text-amber-900">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-xs">¿Confirmar ejecución inmediata?</p>
                      <p className="text-[11px] text-amber-800 mt-0.5 leading-normal">
                        Se iniciará el proceso batch &quot;{modalProceso.nombre}&quot; bajo demanda. Esto puede tomar varios segundos.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmEjecutar(false)}
                      disabled={isExecuting}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleEjecutarProceso}
                      isLoading={isExecuting}
                      icon={<CheckCircle2 size={14} />}
                    >
                      Sí, ejecutar ahora
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-4">

              <div>
                {!confirmEjecutar && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setConfirmEjecutar(true)}
                    disabled={isSavingModal || isExecuting}
                    icon={<Play size={13} />}
                  >
                    Ejecutar ahora
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseModal}
                  disabled={isSavingModal || isExecuting}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleGuardarModal}
                  isLoading={isSavingModal}
                  disabled={isExecuting}
                  icon={<Save size={14} />}
                >
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
