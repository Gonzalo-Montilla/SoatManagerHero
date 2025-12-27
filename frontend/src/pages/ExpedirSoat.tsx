import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { soatAPI } from '../api/soat';
import { TipoMotoCCEnum } from '../types/index.js';
import type { Bolsa } from '../types/index.js';
import { formatCurrency } from '../utils/format';

const SALDO_MINIMO = 2000000; // Umbral para alerta de saldo bajo

const ExpedirSoat: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    placa: '',
    cedula: '',
    nombre_propietario: '',
    tipo_moto: TipoMotoCCEnum.HASTA_99CC,
    observaciones: '',
  });
  const [documentoFactura, setDocumentoFactura] = useState<File | null>(null);
  const [documentoSoat, setDocumentoSoat] = useState<File | null>(null);
  const [bolsa, setBolsa] = useState<Bolsa | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSaldo();
  }, []);

  const loadSaldo = async () => {
    try {
      const bolsaData = await soatAPI.getSaldo();
      setBolsa(bolsaData);
    } catch (err) {
      console.error('Error al cargar saldo:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, tipo: 'factura' | 'soat') => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar que sea PDF
      if (file.type !== 'application/pdf') {
        setError(`El documento de ${tipo} debe ser un archivo PDF`);
        return;
      }
      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError(`El documento de ${tipo} no debe superar 10MB`);
        return;
      }
      setError('');
      if (tipo === 'factura') {
        setDocumentoFactura(file);
      } else {
        setDocumentoSoat(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar archivos
    if (!documentoFactura) {
      setError('Debe cargar el documento de factura');
      return;
    }
    if (!documentoSoat) {
      setError('Debe cargar el documento SOAT');
      return;
    }

    setLoading(true);

    try {
      await soatAPI.expedirSoat(formData, documentoFactura, documentoSoat);
      setSuccess(true);
      setTimeout(() => {
        navigate('/soats');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al expedir SOAT');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center tracking-tight">Expedir SOAT</h1>

      {/* Tarjeta de Saldo */}
      {bolsa && (
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 overflow-hidden shadow-xl rounded-2xl mb-6 max-w-2xl mx-auto transform hover:scale-[1.02] transition-all duration-300">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-blue-100 uppercase tracking-wide">Saldo en Bolsa</h3>
                <p className="text-4xl font-bold text-white mt-2">
                  {formatCurrency(bolsa.saldo_actual)}
                </p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-full p-3">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de Saldo Bajo */}
      {bolsa && bolsa.saldo_actual < SALDO_MINIMO && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-5 mb-6 max-w-2xl mx-auto rounded-r-xl shadow-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="bg-yellow-400 rounded-full p-2">
                <svg className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-semibold text-yellow-800">
                <strong>⚠️ Saldo bajo:</strong> El saldo actual es menor a {formatCurrency(SALDO_MINIMO)}. Considere hacer una recarga pronto.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-xl rounded-2xl max-w-2xl mx-auto border border-gray-200">
        <div className="px-6 py-8">
          {success && (
            <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-md">
              <p className="text-sm font-semibold text-green-800">✅ SOAT expedido exitosamente. Redirigiendo...</p>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-md">
              <p className="text-sm font-semibold text-red-800">❌ {error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Placa *</label>
              <input
                type="text"
                required
                value={formData.placa}
                onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="ABC123"
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Cédula <span className="text-gray-400 font-normal">(Opcional)</span></label>
              <input
                type="text"
                value={formData.cedula}
                onChange={(e) => setFormData({ ...formData, cedula: e.target.value.toUpperCase() })}
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="1234567890"
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del Propietario <span className="text-gray-400 font-normal">(Opcional)</span></label>
              <input
                type="text"
                value={formData.nombre_propietario}
                onChange={(e) => setFormData({ ...formData, nombre_propietario: e.target.value.toUpperCase() })}
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="JUAN PÉREZ"
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Moto *</label>
              <select
                value={formData.tipo_moto}
                onChange={(e) => setFormData({ ...formData, tipo_moto: e.target.value as typeof TipoMotoCCEnum[keyof typeof TipoMotoCCEnum] })}
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value={TipoMotoCCEnum.HASTA_99CC}>Hasta 99cc - $243,700 + $30,000</option>
                <option value={TipoMotoCCEnum.DE_100_200CC}>100-200cc - $326,600 + $30,000</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Observaciones <span className="text-gray-400 font-normal">(Opcional)</span></label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                rows={3}
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="Observaciones adicionales..."
              />
            </div>

            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📎 Documentos PDF</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Documento de Factura/Documentos * 
                    <span className="text-gray-500 text-xs ml-1">(Máx. 10MB)</span>
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => handleFileChange(e, 'factura')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    required
                  />
                  {documentoFactura && (
                    <p className="mt-1 text-sm text-green-600">✓ {documentoFactura.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Documento SOAT * 
                    <span className="text-gray-500 text-xs ml-1">(Máx. 10MB)</span>
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => handleFileChange(e, 'soat')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    required
                  />
                  {documentoSoat && (
                    <p className="mt-1 text-sm text-green-600">✓ {documentoSoat.name}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex space-x-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {loading ? '⏳ Expediendo...' : '✅ Expedir SOAT'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/soats')}
                className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all duration-200"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExpedirSoat;
