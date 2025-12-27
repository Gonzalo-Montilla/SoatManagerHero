import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { soatAPI } from '../api/soat';
import type { Bolsa, DashboardStats } from '../types/index.js';
import { formatCurrency } from '../utils/format';

const Dashboard: React.FC = () => {
  const { isAdmin } = useAuth();
  const [bolsa, setBolsa] = useState<Bolsa | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pequeño delay para asegurar que el token esté en localStorage
    const timer = setTimeout(() => {
      loadData();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const loadData = async () => {
    try {
      const bolsaData = await soatAPI.getSaldo();
      setBolsa(bolsaData);

      if (isAdmin) {
        const statsData = await soatAPI.getStats();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10">Cargando...</div>;
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center tracking-tight">Dashboard</h1>

      {/* Saldo de Bolsa */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 overflow-hidden shadow-xl rounded-2xl mb-8 transform hover:scale-[1.02] transition-all duration-300">
        <div className="p-8">
          <div className="flex items-center">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-100 uppercase tracking-wide">Saldo en Bolsa</h3>
              <p className="text-5xl font-bold text-white mt-3">
                {bolsa ? formatCurrency(bolsa.saldo_actual) : '$0'}
              </p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-4">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas Admin */}
      {isAdmin && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow-lg rounded-xl hover:shadow-2xl transition-all duration-300 border border-gray-100">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total SOATs</h3>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_soats_expedidos}</p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-lg rounded-xl hover:shadow-2xl transition-all duration-300 border border-gray-100">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Comisiones</h3>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {formatCurrency(stats.total_comisiones_generadas)}
                  </p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-lg rounded-xl hover:shadow-2xl transition-all duration-300 border border-gray-100">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Recargas</h3>
                  <p className="text-3xl font-bold text-purple-600 mt-2">
                    {formatCurrency(stats.total_recargas)}
                  </p>
                </div>
                <div className="bg-purple-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-lg rounded-xl hover:shadow-2xl transition-all duration-300 border border-gray-100">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">SOATs Hoy</h3>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{stats.soats_hoy}</p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
