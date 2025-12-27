import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Usuario, LoginData } from '../types/index.js';
import { RolEnum } from '../types/index.js';
import { authAPI } from '../api/auth';

interface AuthContextType {
  usuario: Usuario | null;
  loading: boolean;
  login: (data: LoginData) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const usuarioGuardado = localStorage.getItem('usuario');

    if (token && usuarioGuardado) {
      try {
        const user = JSON.parse(usuarioGuardado);
        setUsuario(user);
      } catch (error) {
        console.error('Error al cargar usuario:', error);
        logout();
      }
    }
    setLoading(false);
  };

  const login = async (data: LoginData) => {
    try {
      const response = await authAPI.login(data);
      
      // Guardar en localStorage
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('usuario', JSON.stringify(response.usuario));
      
      // Actualizar estado
      setUsuario(response.usuario);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  };

  const isAdmin = usuario?.rol === RolEnum.ADMIN;

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
