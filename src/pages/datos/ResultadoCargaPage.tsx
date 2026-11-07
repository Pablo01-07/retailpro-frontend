import React, { useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataApi, UploadResultResponse } from '@/api/data';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { AlertBanner } from '@/components/common/AlertBanner';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { formatDateTimeLima, formatNumber } from '@/lib/formatters';
import { AxiosError } from 'axios';

export const ResultadoCargaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();

  const initialUploadResult = (location.state as { uploadResult?: UploadResultResponse; fileName?: string })?.uploadResult;
  const initialFileName = (location.state as { uploadResult?: UploadResultResponse; fileName?: string })?.fileName;

  const [procesarSuccess, setProcesarSuccess] = useState<string | null>(null);
  const [procesarError, setProcesarError] = useState<string | null>(null);

  const {
    data: cargaDetalle,
    isLoading: loadingDetalle,
  } = useQuery({
    queryKey: ['carga-detalle', id],
    queryFn: () => dataApi.getCargaDetalle(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const estado = query.state.data?.carga?.estado?.toUpperCase();
      return estado === 'EN PROGRESO' || estado === 'PENDIENTE' ? 3000 : false;
    },
  });

  const {
    data: incidencias,
    isLoading: loadingIncidencias,
  } = useQuery({
    queryKey: ['carga-incidencias', id],
    queryFn: () => dataApi.getCargaIncidencias(id!),
    enabled: !!id,
  });

  const procesarMutation = useMutation({
    mutationFn: () => dataApi.procesarValidos(id!),
    onSuccess: (res) => {
      setProcesarSuccess(res.mensaje || 'Registros válidos procesados e incorporados al sistema.');
      setProcesarError(null);
      queryClient.invalidateQueries({ queryKey: ['carga-detalle', id] });
      queryClient.invalidateQueries({ queryKey: ['estado-datos'] });
    },
    onError: (err: unknown) => {
      if (err instanceof AxiosError) {
        const detail = err.response?.data?.message || err.response?.data?.detail;
        setProcesarError(
          typeof detail === 'string'
            ? detail
            : 'Error al procesar los registros válidos de la carga.'
        );
      } else {
        setProcesarError('Ocurrió un error inesperado.');
      }
    },
  });

  const carga = cargaDetalle?.carga;
  const resumen = cargaDetalle?.resumen;

  const fileName =
    carga?.nombre_archivo ||
    (resumen?.nombre_archivo as string) ||
    initialFileName ||
    (resumen?.filename as string) ||
    `Carga #${id}`;

  const totalProcesados =
    carga?.registros_procesados ??
    initialUploadResult?.registros_procesados ??
    0;

  const totalRechazados =
    carga?.registros_rechazados ??
    initialUploadResult?.registros_rechazados ??
    0;

  const totalValidos =
    (resumen?.registros_validos as number) ??
    initialUploadResult?.registros_validos ??
    Math.max(0, totalProcesados - totalRechazados);

  const desglose = (resumen?.desglose_errores as Record<string, number>) || initialUploadResult?.resumen_errores || {};
  const totalDuplicados = desglose['duplicados'] || desglose['duplicados_base'] || 0;

  const estadoDisplay =
    carga?.estado_display ||
    initialUploadResult?.estado_display ||
    carga?.estado ||
    'Procesado';

  const estadoRaw = carga?.estado || initialUploadResult?.estado || 'COMPLETADO';

  const listaIncidencias = incidencias || cargaDetalle?.muestra_incidencias || [];

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Resultado de carga y validación
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Revise el estado y las incidencias encontradas en el archivo procesado.
        </p>
      </div>

      {procesarSuccess && (
        <AlertBanner type="success" message={procesarSuccess} onClose={() => setProcesarSuccess(null)} />
      )}
      {procesarError && (
        <AlertBanner type="danger" message={procesarError} onClose={() => setProcesarError(null)} />
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-6 divide-x divide-gray-200">
          <div>
            <span className="block text-xs text-gray-500 font-medium mb-0.5">Nombre de archivo</span>
            <span className="text-sm font-bold text-gray-900">{fileName}</span>
          </div>
          <div className="pl-6">
            <span className="block text-xs text-gray-500 font-medium mb-0.5">Fecha de carga</span>
            <span className="text-sm font-bold text-gray-900">
              {formatDateTimeLima(carga?.fecha_ejecucion)}
            </span>
          </div>
        </div>

        <div>
          <Badge status={estadoRaw}>{estadoDisplay}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <span className="block text-xs text-gray-500 font-medium mb-1">Registros procesados</span>
          <span className="text-3xl font-extrabold text-gray-900">
            {formatNumber(totalProcesados)}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <span className="block text-xs text-gray-500 font-medium mb-1">Registros válidos</span>
          <span className="text-3xl font-extrabold text-emerald-600">
            {formatNumber(totalValidos)}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <span className="block text-xs text-gray-500 font-medium mb-1">Registros duplicados</span>
          <span className="text-3xl font-extrabold text-amber-500">
            {formatNumber(totalDuplicados)}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <span className="block text-xs text-gray-500 font-medium mb-1">Registros rechazados</span>
          <span className="text-3xl font-extrabold text-red-600">
            {formatNumber(totalRechazados)}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Detalle de incidencias de validación</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Mostrando {listaIncidencias.length} de {listaIncidencias.length} incidencias reportadas
            </p>
          </div>
        </div>

        {loadingDetalle || loadingIncidencias ? (
          <div className="p-8 text-center text-sm text-gray-500">Cargando incidencias del archivo...</div>
        ) : listaIncidencias.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle size={36} className="text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-gray-900">Sin incidencias reportadas</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Todos los registros evaluados cumplieron las reglas de sintaxis y consistencia.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6 w-24">Línea</th>
                  <th className="py-3 px-6 w-36">Campo</th>
                  <th className="py-3 px-6 w-56">Tipo de error</th>
                  <th className="py-3 px-6">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {listaIncidencias.map((inc, index) => (
                  <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-6 text-gray-700 tabular-nums text-xs">{inc.fila}</td>
                    <td className="py-3.5 px-6 text-gray-900 font-medium">{inc.columna}</td>
                    <td className="py-3.5 px-6 text-red-600 font-medium">{inc.tipo_error}</td>
                    <td className="py-3.5 px-6 text-gray-600 leading-relaxed">{inc.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Link to="/datos/carga">
          <Button variant="secondary" size="md" icon={<ArrowLeft size={16} />}>
            Volver a carga de archivos
          </Button>
        </Link>

        <Button
          variant="primary"
          size="md"
          onClick={() => procesarMutation.mutate()}
          isLoading={procesarMutation.isPending}
          disabled={totalValidos === 0 || estadoRaw === 'FALLIDO' || estadoRaw === 'RECHAZADO'}
          icon={<CheckCircle size={16} />}
        >
          Procesar registros válidos
        </Button>
      </div>
    </div>
  );
};
