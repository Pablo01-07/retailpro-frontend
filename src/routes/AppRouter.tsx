import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { AppLayout } from '@/layouts/AppLayout';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { LoginPage } from '@/pages/auth/LoginPage';
import { PasswordRecoveryPage } from '@/pages/auth/PasswordRecoveryPage';
import { RestablecerContrasenaPage } from '@/pages/auth/RestablecerContrasenaPage';
import { EstadoDatosPage } from '@/pages/datos/EstadoDatosPage';
import { CargaArchivosPage } from '@/pages/datos/CargaArchivosPage';
import { ResultadoCargaPage } from '@/pages/datos/ResultadoCargaPage';
import { CalidadDatosPage } from '@/pages/datos/CalidadDatosPage';
import { MonitoreoProcesosPage } from '@/pages/procesos/MonitoreoProcesosPage';
import { DetalleEjecucionPage } from '@/pages/procesos/DetalleEjecucionPage';
import { ConfiguracionProcesosPage } from '@/pages/procesos/ConfiguracionProcesosPage';
import { PronosticoVentasPage } from '@/pages/prediccion/PronosticoVentasPage';
import { FichaModeloPage } from '@/pages/prediccion/FichaModeloPage';
import { MonitoreoModeloPage } from '@/pages/prediccion/MonitoreoModeloPage';
import { HistorialVersionesPage } from '@/pages/prediccion/HistorialVersionesPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { TendenciasVentasPage } from '@/pages/dashboard/TendenciasVentasPage';
import { RecomendacionesReposicionPage } from '@/pages/inventarios/RecomendacionesReposicionPage';
import { NivelServicioPage } from '@/pages/inventarios/NivelServicioPage';
import { CentroAlertasPage } from '@/pages/alertas/CentroAlertasPage';
import { ConfiguracionUmbralesPage } from '@/pages/alertas/ConfiguracionUmbralesPage';
import { CentroReportesPage } from '@/pages/reportes/CentroReportesPage';
import { ExportacionPronosticoPage } from '@/pages/reportes/ExportacionPronosticoPage';
import { ListadoUsuariosPage } from '@/pages/usuarios/ListadoUsuariosPage';
import { FormularioUsuarioPage } from '@/pages/usuarios/FormularioUsuarioPage';
import { AuditoriaSistemaPage } from '@/pages/auditoria/AuditoriaSistemaPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/recuperar-acceso" element={<PasswordRecoveryPage />} />
        <Route path="/restablecer-contrasena" element={<RestablecerContrasenaPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['administrador', 'analista', 'jefe_logistica']}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/tendencias"
          element={
            <ProtectedRoute allowedRoles={['administrador', 'analista', 'jefe_logistica']}>
              <TendenciasVentasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventarios/tendencias"
          element={
            <ProtectedRoute allowedRoles={['administrador', 'analista', 'jefe_logistica']}>
              <TendenciasVentasPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/datos"
          element={
            <ProtectedRoute allowedRoles={['administrador', 'analista']}>
              <EstadoDatosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/datos/carga"
          element={
            <ProtectedRoute allowedRoles={['administrador', 'analista']}>
              <CargaArchivosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/datos/cargas/:id"
          element={
            <ProtectedRoute allowedRoles={['administrador', 'analista']}>
              <ResultadoCargaPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/datos/calidad"
          element={
            <ProtectedRoute allowedRoles={['administrador', 'analista']}>
              <CalidadDatosPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/procesos"
          element={
            <ProtectedRoute allowedRoles={['administrador', 'analista']}>
              <MonitoreoProcesosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/procesos/:id"
          element={
            <ProtectedRoute allowedRoles={['administrador', 'analista']}>
              <DetalleEjecucionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/procesos/configuracion"
          element={
            <ProtectedRoute allowedRoles={['administrador']}>
              <ConfiguracionProcesosPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prediccion"
          element={
            <ProtectedRoute allowedRoles={['administrador', 'analista', 'jefe_logistica']}>
              <PronosticoVentasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/prediccion/ficha"
          element={
            <ProtectedRoute allowedRoles={['administrador', 'analista', 'jefe_logistica']}>
              <FichaModeloPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/prediccion/monitoreo"
          element={
            <ProtectedRoute allowedRoles={['administrador', 'analista', 'jefe_logistica']}>
              <MonitoreoModeloPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/prediccion/historial"
          element={
            <ProtectedRoute allowedRoles={['administrador', 'analista', 'jefe_logistica']}>
              <HistorialVersionesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventarios"
          element={
            <ProtectedRoute allowedRoles={['administrador', 'analista', 'jefe_logistica']}>
              <RecomendacionesReposicionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventarios/nivel-servicio"
          element={
            <ProtectedRoute allowedRoles={['administrador', 'analista', 'jefe_logistica']}>
              <NivelServicioPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/alertas"
          element={
            <ProtectedRoute allowedRoles={['administrador', 'analista', 'jefe_logistica']}>
              <CentroAlertasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/alertas/umbrales"
          element={
            <ProtectedRoute allowedRoles={['administrador', 'analista', 'jefe_logistica']}>
              <ConfiguracionUmbralesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reportes"
          element={
            <ProtectedRoute allowedRoles={['administrador', 'analista', 'jefe_logistica']}>
              <CentroReportesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reportes/exportar"
          element={
            <ProtectedRoute allowedRoles={['administrador', 'analista']}>
              <ExportacionPronosticoPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/usuarios"
          element={
            <ProtectedRoute allowedRoles={['administrador']}>
              <ListadoUsuariosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/usuarios/nuevo"
          element={
            <ProtectedRoute allowedRoles={['administrador']}>
              <FormularioUsuarioPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/usuarios/:id"
          element={
            <ProtectedRoute allowedRoles={['administrador']}>
              <FormularioUsuarioPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/usuarios/:id/editar"
          element={
            <ProtectedRoute allowedRoles={['administrador']}>
              <FormularioUsuarioPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/auditoria"
          element={
            <ProtectedRoute allowedRoles={['administrador']}>
              <AuditoriaSistemaPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
