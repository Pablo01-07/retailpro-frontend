import { apiClient } from '@/api/client';

export const downloadAuthenticatedBlob = async (endpointOrUrl: string, fallbackFilename = 'reporte.xlsx') => {
  try {
    let url = endpointOrUrl;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const parsed = new URL(url);
      url = parsed.pathname;
    }
    url = url.replace(/^\/api\/v1/, '');

    const response = await apiClient.get(url, {
      responseType: 'blob',
    });

    let filename = fallbackFilename;
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '');
      }
    }

    const blob = new Blob([response.data]);
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Error al descargar archivo autenticado:', error);
    throw error;
  }
};
