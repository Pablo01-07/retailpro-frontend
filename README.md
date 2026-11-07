# RetailPro Frontend

Plataforma web de predicción de volumen de ventas e inventarios para una empresa de retail de Lima (**FasRetail, Perú**), conectada integralmente al backend FastAPI con base de datos PostgreSQL.

---

## 1. Stack Tecnológico

- **React 18** + **TypeScript** + **Vite** (servidor en puerto local `5173`).
- **Tailwind CSS**: Tokens corporativos extraídos de los 24 mockups (`verde corporativo #15803d`, `verde menú #14532d`, `gris neutro #f3f4f6`).
- **React Router v6**: Enrutamiento declarativo y rutas protegidas con control de acceso basado en roles (RBAC) y pantalla amigable de error `403 Acceso Restringido`.
- **TanStack Query v5**: Gestión reactiva del estado del servidor, cacheo inteligente, refetch inmediato y sincronización tras mutaciones.
- **React Hook Form** + **Zod**: Validación estricta de formularios y tipos.
- **Recharts**: Gráficos de barras agrupadas divergentes (SHAP), series de tiempo, barras de evaluación walk-forward y dona de categorías.
- **Axios**: Cliente HTTP tipado con interceptor de renovación silenciosa de JWT ante HTTP 401 y token en memoria.
- **ErrorBoundary**: Captura global de errores en renderizado con mensaje amigable e inspección técnica para entorno de desarrollo.

---

## 2. Matriz de Control de Acceso Oficial (RBAC: Pantalla × Rol)

Política de acceso implementada en el frontend mediante enrutamiento protegido ([`ProtectedRoute.tsx`](file:///C:/UPC/CICLO%2010/TP1/P20262014_Codigo/RetailPro_Frontend/src/auth/ProtectedRoute.tsx)), menú lateral ([`Sidebar.tsx`](file:///C:/UPC/CICLO%2010/TP1/P20262014_Codigo/RetailPro_Frontend/src/layouts/Sidebar.tsx)) y control granular de botones de acción:

| Pantalla | Administrador | Analista | Jefe de Logística |
|---|---|---|---|
| 01. Login | ✔ | ✔ | ✔ |
| 02. Recuperar acceso | ✔ | ✔ | ✔ |
| 03. Estado de datos | ✔ | ✔ | ✘ |
| 04. Carga de archivos | ✔ | ✔ | ✘ |
| 05. Resultado de carga | ✔ | ✔ | ✘ |
| 06. Calidad de datos | ✔ | ✔ | ✘ |
| 07. Monitoreo de procesos | ✔ | Solo pronóstico | ✘ |
| 08. Detalle de ejecución | ✔ | Solo ver | ✘ |
| 09. Config. procesos | ✔ | ✘ | ✘ |
| 10. Pronóstico de ventas | ✔ | ✔ | Solo ver |
| 11. Ficha del modelo | ✔ | ✔ | Solo ver |
| 12. Monitoreo del modelo | ✔ | ✔ | Solo ver |
| 13. Historial y SHAP | ✔ | Solo ver | Solo ver |
| 14. Dashboard ejecutivo | ✔ | ✔ | ✔ |
| 15. Tendencias de demanda | ✔ | ✔ | ✔ |
| 16. Plan de reposición | Ver, ajustar y exportar | Ver, ajustar y exportar | Solo ver |
| 17. Nivel de servicio | ✔ | ✔ | ✔ |
| 18. Centro de alertas | Ver y gestionar | Ver y gestionar | Solo ver |
| 19. Config. umbrales | Ver y guardar | Solo ver | Solo ver |
| 20. Centro de reportes | Generar y descargar | Generar y descargar | Solo descargar |
| 21. Exportar pronóstico | ✔ | ✔ | ✘ |
| 22. Gestión de usuarios | ✔ | ✘ | ✘ |
| 23. Formulario usuario | ✔ | ✘ | ✘ |
| 24. Auditoría del sistema | ✔ | ✘ | ✘ |

---

## 3. Limitaciones Conocidas y Decisiones de Negocio

1. **Gestión de Sesión y Refresh Token:**
   - El `access_token` JWT se mantiene **estrictamente en memoria** de la aplicación React.
   - El `refresh_token` se almacena temporalmente en `sessionStorage` para mantener la sesión activa durante recargas (F5) en desarrollo local.
2. **Datos Sintéticos de Retail:**
   - Toda la información corresponde a 60 SKUs en 6 categorías de consumo masivo modeladas para la operación de FasRetail en Lima Metropolitana.
3. **Fecha Base de Información:**
   - El último registro transaccional disponible en el histórico de ventas corresponde al **20 de octubre de 2026**.
4. **Ventanas de Evaluación de 14 Días por Mes:**
   - En las Pantallas 14 (`/dashboard`) y 15 (`/dashboard/tendencias`), cada barra mensual representa la ventana fija de 14 días (del día 02 al 15 de cada mes) evaluada en el corte Walk-Forward correspondiente del backtesting, comparando real vs. proyectado en idéntico período.
5. **Horizonte Predictivo:**
   - El modelo XGBoost en producción opera con un horizonte quincenal fijo de **14 días**. El botón "Generar pronóstico" utiliza `POST /procesos/ejecutar/pronostico` (~1 s, idempotente por día) sin reentrenar.
6. **Métricas de Inventario en Dashboard (Pantalla 14):**
   - **"Stock bajo" (5 SKU):** Calculado y provisto directamente por el backend (`GET /dashboard/resumen` en `top_riesgo_quiebre`), el cual evalúa los SKUs cuyo inventario cumple `stock_actual <= punto_reorden` y cobertura proyectada menor a 7 días, ordenados por menor cobertura y mayor probabilidad de quiebre.
   - **"En riesgo crítico de quiebre" (9 SKU):** Obtenido a partir del KPI del backend `Alertas Críticas (Quiebre Inminente)` provisto en `GET /dashboard/resumen`, correspondiente a las alertas activas de tipo `QUIEBRE` con severidad `CRITICA` y prioridad `ALTA`.
7. **Consistencia de Alertas (Pantalla 18):**
   - La tarjeta de métricas "Quiebre de stock" muestra los conteos agregados oficiales devueltos por el backend (`total_criticas` y `total_advertencias`). En el catálogo base activo, suman exactamente 12 alertas (9 de prioridad Alta y 3 de prioridad Media), coincidiendo fielmente con las filas desplegadas en la tabla sin filtros.
8. **Seguridad y Trazabilidad en Auditoría (Pantalla 24):**
   - La sección "Metadata técnica" en el panel lateral de auditoría cuenta con claves traducidas al español (`Dirección IP`, `Correo`, `Usuario modificado`, etc.), indentación de 2 espacios con tamaño de fuente legible, un botón interactivo de copiado directo al portapapeles y un enmascaramiento preventivo en memoria (`••••••••`) para cualquier propiedad que refiera a credenciales, contraseñas, hashes o tokens.
9. **Notificaciones por Correo Electrónico (Pantalla 09):**
   - La configuración se guarda, pero el envío de correos no está implementado en esta versión.

---

## 4. Instrucciones para Ejecución Local

### 4.1 Prerrequisitos
- **Node.js** versión 18 o superior.
- **Backend de RetailPro** ejecutándose en `http://127.0.0.1:8000`.

### 4.2 Instalación e Inicio
```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo en puerto 5173
npm run dev

# 3. Compilar para producción (validación de tipos TypeScript y assets Vite)
npm run build
```
La aplicación web quedará accesible en: `http://localhost:5173`.

---

## 5. Control de Acceso y Roles del Sistema

- **Administrador (`administrador`)**: Acceso total al catálogo, gestión de usuarios, bitácora de auditoría Ley N.° 29733, ejecución y configuración batch de procesos, y edición de umbrales operacionales.
- **Analista de Inventarios (`analista`)**: Carga y validación de archivos ETL, calidad de datos, generación y ajuste de pronósticos, recomendaciones de compra y exportación de reportes. Menús de usuarios y auditoría bloqueados.
- **Jefe de Logística (`jefe_logistica`)**: Modo de consulta ejecutiva en Dashboard, Nivel de Servicio, Tendencias, Centro de Alertas y Reportes. Restringido para ingesta ETL, configuración batch, administración de usuarios y edición de umbrales.
