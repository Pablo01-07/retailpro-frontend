import React, { useState, useRef } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { dataApi } from '@/api/data';
import { Button } from '@/components/common/Button';
import { AlertBanner } from '@/components/common/AlertBanner';
import { UploadCloud, FileSpreadsheet, Trash2, CheckCircle2 } from 'lucide-react';
import { AxiosError } from 'axios';

export const CargaArchivosPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tipoCarga, setTipoCarga] = useState<'ventas' | 'inventario' | 'productos'>('ventas');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);
    const validExtensions = ['.csv', '.xlsx'];
    const fileExt = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      setErrorMessage('Formato de archivo no soportado. Debe ser un archivo CSV o XLSX.');
      return;
    }

    const maxSizeMB = 50;
    if (file.size > maxSizeMB * 1024 * 1024) {
      setErrorMessage(`El archivo supera el tamaño máximo permitido de ${maxSizeMB} MB.`);
      return;
    }

    setSelectedFile(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Por favor seleccione un archivo para continuar.');
      return;
    }

    setErrorMessage(null);
    setUploadProgress(0);

    try {
      const result = await dataApi.uploadFile(selectedFile, tipoCarga, (percent) => {
        setUploadProgress(percent);
      });

      navigate(`/datos/cargas/${result.id_carga}`, {
        state: { uploadResult: result, fileName: selectedFile.name },
      });
    } catch (err: unknown) {
      setUploadProgress(null);
      if (err instanceof AxiosError) {
        const detail = err.response?.data?.message || err.response?.data?.detail;
        setErrorMessage(
          typeof detail === 'string'
            ? detail
            : 'Error al subir el archivo. Verifique el formato e intente nuevamente.'
        );
      } else {
        setErrorMessage('Ocurrió un error inesperado al cargar el archivo.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6 border-b border-gray-200 text-sm font-medium">
        <NavLink
          to="/datos"
          end
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Estado de Datos
        </NavLink>
        <NavLink
          to="/datos/carga"
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Carga de Archivos
        </NavLink>
        <NavLink
          to="/datos/calidad"
          className={({ isActive }) =>
            `pb-3 border-b-2 font-semibold transition-colors ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          Calidad de Datos
        </NavLink>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Carga de archivos
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Cargue archivos planos CSV o planillas Excel para actualizar los catálogos y transacciones.
        </p>
      </div>

      {errorMessage && (
        <AlertBanner type="danger" message={errorMessage} onClose={() => setErrorMessage(null)} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        <div className="lg:col-span-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                1. Seleccione el Tipo de Información
              </label>
              <select
                value={tipoCarga}
                onChange={(e) => setTipoCarga(e.target.value as 'ventas' | 'inventario' | 'productos')}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-700/40 focus:border-brand-700 transition-colors"
              >
                <option value="ventas">Transacciones de Ventas</option>
                <option value="inventario">Nivel de Stock - Inventario</option>
                <option value="productos">Catálogo Maestro de Productos</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                2. Arrastre o suba su archivo
              </label>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  isDragging
                    ? 'border-brand-700 bg-emerald-50/50'
                    : 'border-brand-700/60 bg-white hover:bg-gray-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.xlsx"
                  className="hidden"
                />

                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 text-brand-700">
                  <UploadCloud size={24} />
                </div>

                <p className="text-sm font-bold text-gray-900 mb-1">
                  Arrastra tu archivo aquí o
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Formatos soportados: CSV, XLSX (máx 50MB)
                </p>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Seleccionar archivo
                </Button>
              </div>
            </div>

            {selectedFile && (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-lg">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      Tamaño: {formatFileSize(selectedFile.size)} • Listo para procesar
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                  title="Eliminar archivo seleccionado"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}

            {uploadProgress !== null && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-gray-700">
                  <span>Subiendo y validando sintaxis...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-brand-700 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full py-3"
              disabled={!selectedFile || uploadProgress !== null}
              isLoading={uploadProgress !== null}
            >
              Iniciar carga y validación
            </Button>
          </form>
        </div>

        <div className="lg:col-span-4 bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-3">
              Instrucciones de formato
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              Para asegurar que las predicciones inteligentes e informes de RetailPro se generen sin errores, compruebe las siguientes pautas estructurales:
            </p>

            <div className="space-y-3.5">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-brand-700 shrink-0 mt-0.5" />
                <span className="text-xs text-gray-700 leading-snug">
                  La columna <strong>fecha</strong> debe usar el formato estándar ISO (AAAA-MM-DD).
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-brand-700 shrink-0 mt-0.5" />
                <span className="text-xs text-gray-700 leading-snug">
                  El identificador del local o sucursal debe coincidir con el registro maestro.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-brand-700 shrink-0 mt-0.5" />
                <span className="text-xs text-gray-700 leading-snug">
                  Las cantidades numéricas no deben incluir caracteres especiales de moneda ni separadores de miles decimales.
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
              Validaciones del sistema
            </h4>
            <ul className="space-y-2 text-xs text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-700 shrink-0"></span>
                <span>Estructura de columnas válida</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-700 shrink-0"></span>
                <span>Verificación de registros nulos sin advertencias</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
