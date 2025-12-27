import apiClient from './client';
import type {
  Bolsa,
  Recarga,
  RecargaCreate,
  SoatExpedido,
  SoatExpedidoCreate,
  DashboardStats,
} from '../types/index.js';

export const soatAPI = {
  // Bolsa
  getSaldo: async (): Promise<Bolsa> => {
    const response = await apiClient.get<Bolsa>('/api/bolsa/saldo');
    return response.data;
  },

  // Recargas
  crearRecarga: async (data: RecargaCreate, archivo?: File): Promise<Recarga> => {
    const formData = new FormData();
    formData.append('monto', data.monto.toString());
    if (data.referencia) {
      formData.append('referencia', data.referencia);
    }
    if (data.observaciones) {
      formData.append('observaciones', data.observaciones);
    }
    if (archivo) {
      formData.append('documento_comprobante', archivo);
    }

    const response = await apiClient.post<Recarga>('/api/recargas/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  listarRecargas: async (): Promise<Recarga[]> => {
    const response = await apiClient.get<Recarga[]>('/api/recargas/');
    return response.data;
  },

  getDocumentoComprobanteUrl: (recargaId: number): string => {
    const token = localStorage.getItem('token');
    return `${import.meta.env.VITE_API_URL}/api/recargas/${recargaId}/documento-comprobante?token=${token}`;
  },

  // SOATs
  expedirSoat: async (
    data: SoatExpedidoCreate,
    documentoFactura: File,
    documentoSoat: File
  ): Promise<SoatExpedido> => {
    const formData = new FormData();
    formData.append('placa', data.placa);
    if (data.cedula && data.cedula.trim() !== '') {
      formData.append('cedula', data.cedula);
    }
    if (data.nombre_propietario && data.nombre_propietario.trim() !== '') {
      formData.append('nombre_propietario', data.nombre_propietario);
    }
    formData.append('tipo_moto', data.tipo_moto);
    if (data.observaciones) {
      formData.append('observaciones', data.observaciones);
    }
    formData.append('documento_factura', documentoFactura);
    formData.append('documento_soat', documentoSoat);

    const response = await apiClient.post<SoatExpedido>('/api/soats/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  listarSoats: async (): Promise<SoatExpedido[]> => {
    const response = await apiClient.get<SoatExpedido[]>('/api/soats/');
    return response.data;
  },

  obtenerSoat: async (id: number): Promise<SoatExpedido> => {
    const response = await apiClient.get<SoatExpedido>(`/api/soats/${id}`);
    return response.data;
  },

  // Subir póliza
  uploadPoliza: async (soatId: number, documentoPoliza: File): Promise<SoatExpedido> => {
    const formData = new FormData();
    formData.append('documento_poliza', documentoPoliza);

    const response = await apiClient.post<SoatExpedido>(
      `/api/soats/${soatId}/upload-poliza`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Obtener URLs de documentos con token
  getDocumentoFacturaUrl: (soatId: number): string => {
    const token = localStorage.getItem('token');
    return `${import.meta.env.VITE_API_URL}/api/soats/${soatId}/documento-factura?token=${token}`;
  },

  getDocumentoSoatUrl: (soatId: number): string => {
    const token = localStorage.getItem('token');
    return `${import.meta.env.VITE_API_URL}/api/soats/${soatId}/documento-soat?token=${token}`;
  },

  getDocumentoPolizaUrl: (soatId: number): string => {
    const token = localStorage.getItem('token');
    return `${import.meta.env.VITE_API_URL}/api/soats/${soatId}/documento-poliza?token=${token}`;
  },

  // Dashboard
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<DashboardStats>('/api/dashboard/stats');
    return response.data;
  },
};
