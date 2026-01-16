import React, { useEffect, useState } from 'react';
import { soatAPI } from '../api/soat';
import type { SoatExpedido, Bolsa } from '../types/index.js';
import { formatCurrency, formatDate } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

const SALDO_MINIMO = 2000000;

const SoatsList: React.FC = () => {
  const { isAdmin } = useAuth();
  const [soats, setSoats] = useState<SoatExpedido[]>([]);
  const [bolsa, setBolsa] = useState<Bolsa | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchPlaca, setSearchPlaca] = useState('');
  const [showPolizaModal, setShowPolizaModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSoat, setSelectedSoat] = useState<SoatExpedido | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [pdfTitle, setPdfTitle] = useState<string>('');
  const [polizaFile, setPolizaFile] = useState<File | null>(null);
  const [uploadingPoliza, setUploadingPoliza] = useState(false);
  const [editFormData, setEditFormData] = useState({
    placa: '',
    cedula: '',
    nombre_propietario: '',
    tipo_moto: '',
    observaciones: ''
  });
  const [editingSOAT, setEditingSOAT] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [soatsData, bolsaData] = await Promise.all([
        soatAPI.listarSoats(),
        soatAPI.getSaldo(),
      ]);
      setSoats(soatsData);
      setBolsa(bolsaData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerDocumento = (soat: SoatExpedido, tipo: 'factura' | 'soat' | 'poliza') => {
    let url = '';
    let title = '';
    
    if (tipo === 'factura' && soat.documento_factura) {
      url = soatAPI.getDocumentoFacturaUrl(soat.id);
      title = `Factura - SOAT ${soat.id}`;
    } else if (tipo === 'soat' && soat.documento_soat) {
      url = soatAPI.getDocumentoSoatUrl(soat.id);
      title = `SOAT - ${soat.placa}`;
    } else if (tipo === 'poliza' && soat.documento_poliza) {
      url = soatAPI.getDocumentoPolizaUrl(soat.id);
      title = `Póliza - SOAT ${soat.id}`;
    }

    if (url) {
      setPdfUrl(url);
      setPdfTitle(title);
      setShowPdfModal(true);
    }
  };


  const handlePolizaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('El archivo debe ser un PDF');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo no debe superar 10MB');
        return;
      }
      setError('');
      setPolizaFile(file);
    }
  };

  const handleUploadPoliza = async () => {
    if (!selectedSoat || !polizaFile) return;

    setUploadingPoliza(true);
    setError('');

    try {
      await soatAPI.uploadPoliza(selectedSoat.id, polizaFile);
      await loadData();
      setShowPolizaModal(false);
      setSelectedSoat(null);
      setPolizaFile(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al subir póliza');
    } finally {
      setUploadingPoliza(false);
    }
  };

  const handleEditSoat = (soat: SoatExpedido) => {
    setSelectedSoat(soat);
    setEditFormData({
      placa: soat.placa,
      cedula: soat.cedula || '',
      nombre_propietario: soat.nombre_propietario || '',
      tipo_moto: soat.tipo_moto,
      observaciones: soat.observaciones || ''
    });
    setError('');
    setShowEditModal(true);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSoat) return;

    setEditingSOAT(true);
    setError('');

    try {
      await soatAPI.actualizarSoat(selectedSoat.id, editFormData);
      await loadData();
      setShowEditModal(false);
      setSelectedSoat(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al actualizar SOAT');
    } finally {
      setEditingSOAT(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10">Cargando...</div>;
  }

  // Filtrar SOATs por placa
  const filteredSoats = soats.filter(soat =>
    soat.placa.toLowerCase().includes(searchPlaca.toLowerCase())
  );

  // Lógica de paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSoats = filteredSoats.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSoats.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset a página 1 cuando se busca
  const handleSearchChange = (value: string) => {
    setSearchPlaca(value);
    setCurrentPage(1);
  };

  // Exportar a Excel
  const exportToExcel = () => {
    const dataToExport = filteredSoats.map(soat => ({
      'ID': soat.id,
      'Placa': soat.placa,
      'Cédula': soat.cedula || 'N/A',
      'Propietario': soat.nombre_propietario || 'N/A',
      'Tipo Moto': soat.tipo_moto,
      'Valor SOAT': soat.valor_soat,
      'Comisión': soat.comision,
      'Total': soat.total,
      'Observaciones': soat.observaciones || '',
      'Fecha Expedición': formatDate(soat.fecha_expedicion)
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SOATs');
    
    const fileName = searchPlaca 
      ? `SOATs_${searchPlaca}_${new Date().toISOString().split('T')[0]}.xlsx`
      : `SOATs_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 flex-1 text-center tracking-tight">SOATs Expedidos</h1>
        <button
          onClick={exportToExcel}
          disabled={filteredSoats.length === 0}
          className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>📈 Exportar a Excel</span>
        </button>
      </div>

      {/* Tarjeta de Saldo */}
      {bolsa && (
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 overflow-hidden shadow-xl rounded-2xl mb-6 transform hover:scale-[1.02] transition-all duration-300">
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
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-5 mb-6 rounded-r-xl shadow-md">
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

      {/* Barra de Búsqueda */}
      <div className="mb-6 bg-white p-4 rounded-2xl shadow-lg border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchPlaca}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por placa (ej: ABC123)..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            style={{ textTransform: 'uppercase' }}
          />
          {searchPlaca && (
            <button
              onClick={() => handleSearchChange('')}
              className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-all duration-200"
            >
              Limpiar
            </button>
          )}
        </div>
        {searchPlaca && (
          <p className="mt-2 text-sm text-gray-600">
            {filteredSoats.length === 0 ? (
              <span className="text-red-600 font-semibold">❌ No se encontraron SOATs con la placa "{searchPlaca}"</span>
            ) : (
              <span className="text-green-600 font-semibold">✓ Se encontraron {filteredSoats.length} SOAT(s)</span>
            )}
          </p>
        )}
      </div>
      
      <div className="bg-white shadow-xl overflow-hidden rounded-2xl overflow-x-auto border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Placa
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Cédula
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Propietario
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Documentos
              </th>
              {isAdmin && (
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {soats.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="px-6 py-4 text-center text-gray-500">
                  No hay SOATs expedidos
                </td>
              </tr>
            ) : (
              currentSoats.map((soat) => (
                <tr key={soat.id} className="hover:bg-blue-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {soat.placa}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {soat.cedula || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {soat.nombre_propietario || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    {formatCurrency(soat.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(soat.fecha_expedicion)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      {soat.documento_factura && (
                        <button
                          onClick={() => handleVerDocumento(soat, 'factura')}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium transition-colors duration-200"
                          title="Ver Factura"
                        >
                          📄 Factura
                        </button>
                      )}
                      
                      {soat.documento_soat && (
                        <button
                          onClick={() => handleVerDocumento(soat, 'soat')}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium transition-colors duration-200"
                          title="Ver SOAT"
                        >
                          📋 SOAT
                        </button>
                      )}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleEditSoat(soat)}
                        className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 font-medium transition-colors duration-200"
                        title="Editar SOAT"
                      >
                        ✏️ Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Mostrando <span className="font-semibold">{indexOfFirstItem + 1}</span> a{' '}
            <span className="font-semibold">{Math.min(indexOfLastItem, filteredSoats.length)}</span> de{' '}
            <span className="font-semibold">{filteredSoats.length}</span> SOATs{searchPlaca && ' (filtrados)'}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              ← Anterior
            </button>
            
            <div className="flex space-x-1">
              {[...Array(totalPages)].map((_, index) => {
                const pageNumber = index + 1;
                if (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => handlePageChange(pageNumber)}
                      className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
                        currentPage === pageNumber
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                          : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                } else if (
                  pageNumber === currentPage - 2 ||
                  pageNumber === currentPage + 2
                ) {
                  return <span key={pageNumber} className="px-2 py-2 text-gray-500">…</span>;
                }
                return null;
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Modal para Ver PDF */}
      {showPdfModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">{pdfTitle}</h3>
                  <button
                    onClick={() => setShowPdfModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>
                <div className="mt-2">
                  <iframe
                    src={pdfUrl}
                    className="w-full h-96"
                    title={pdfTitle}
                  />
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <a
                  href={pdfUrl}
                  download
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Descargar PDF
                </a>
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Subir Póliza */}
      {showPolizaModal && selectedSoat && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Subir Póliza - SOAT {selectedSoat.placa}
                </h3>
                
                {error && (
                  <div className="mb-4 bg-red-50 p-3 rounded-md">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Documento de Póliza (PDF) <span className="text-gray-500 text-xs">(Máx. 10MB)</span>
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePolizaFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {polizaFile && (
                    <p className="mt-2 text-sm text-green-600">✓ {polizaFile.name}</p>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleUploadPoliza}
                  disabled={!polizaFile || uploadingPoliza}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none disabled:bg-gray-400 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {uploadingPoliza ? 'Subiendo...' : 'Subir Póliza'}
                </button>
                <button
                  onClick={() => {
                    setShowPolizaModal(false);
                    setSelectedSoat(null);
                    setPolizaFile(null);
                    setError('');
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Editar SOAT */}
      {showEditModal && selectedSoat && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm transition-opacity" onClick={() => setShowEditModal(false)}></div>
            
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl transform transition-all max-w-2xl w-full z-20 max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">✏️ Editar SOAT - {selectedSoat.placa}</h3>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>
              </div>
              
              <div className="bg-white px-6 py-6">
                {error && (
                  <div className="mb-4 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-md">
                    <p className="text-sm font-semibold text-red-800">❌ {error}</p>
                  </div>
                )}

                <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-xl">
                  <p className="text-sm text-blue-800">
                    <strong>SOAT #:</strong> {selectedSoat.id}<br/>
                    <strong>Fecha Expedición:</strong> {formatDate(selectedSoat.fecha_expedicion)}<br/>
                    <strong>Total Actual:</strong> {formatCurrency(selectedSoat.total)}
                  </p>
                </div>

                <form onSubmit={handleSubmitEdit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Placa *</label>
                    <input
                      type="text"
                      value={editFormData.placa}
                      onChange={(e) => setEditFormData({ ...editFormData, placa: e.target.value.toUpperCase() })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 font-bold"
                      required
                      maxLength={10}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Cédula</label>
                    <input
                      type="text"
                      value={editFormData.cedula}
                      onChange={(e) => setEditFormData({ ...editFormData, cedula: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre Propietario</label>
                    <input
                      type="text"
                      value={editFormData.nombre_propietario}
                      onChange={(e) => setEditFormData({ ...editFormData, nombre_propietario: e.target.value.toUpperCase() })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Moto *</label>
                    <select
                      value={editFormData.tipo_moto}
                      onChange={(e) => setEditFormData({ ...editFormData, tipo_moto: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200"
                      required
                    >
                      <option value="hasta_99cc">Hasta 99cc - $286,200</option>
                      <option value="100_200cc">100-200cc - $373,300</option>
                    </select>
                    <p className="mt-2 text-xs text-gray-500">
                      ⚠️ Si cambias el tipo de moto, el sistema ajustará automáticamente el saldo de la bolsa.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Observaciones</label>
                    <textarea
                      value={editFormData.observaciones}
                      onChange={(e) => setEditFormData({ ...editFormData, observaciones: e.target.value })}
                      rows={3}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200"
                    />
                  </div>

                  <div className="flex space-x-4 pt-4">
                    <button
                      type="submit"
                      disabled={editingSOAT}
                      className="flex-1 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white px-6 py-3 rounded-xl hover:from-yellow-700 hover:to-yellow-800 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {editingSOAT ? 'Actualizando...' : '✏️ Guardar Cambios'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setError('');
                      }}
                      disabled={editingSOAT}
                      className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all duration-200 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SoatsList;
