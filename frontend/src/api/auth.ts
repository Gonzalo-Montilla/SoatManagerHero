import apiClient from './client';
import type { LoginData, AuthResponse, Usuario } from '../types/index.js';

export const authAPI = {
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/auth/login', data);
    return response.data;
  },

  getMe: async (): Promise<Usuario> => {
    const response = await apiClient.get<Usuario>('/api/auth/me');
    return response.data;
  },
};
