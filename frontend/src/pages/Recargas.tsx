import React, { useEffect, useState } from 'react';
import { soatAPI } from '../api/soat';
import type { Recarga } from '../types/index.js';
import { formatCurrency, formatDate } from '../utils/format';
import { useAuth } from '../context/AuthContext';

const Recargas: React.FC = () => {
  const { isAdmin } = useAuth();
  const [recargas, setRecargas] = useState<Recarga[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [showComprobanteModal, setShowComprobanteModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedRecarga, setSelectedRecarga] = useState<Recarga | null>(null);
  const [comprobanteUrl, setComprobanteUrl] = useState<string>('');
  const [formData, setFormData] = useState({
    monto: '',
    referencia: '',
    observaciones: '',
  });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [archivoUpload, setArchivoUpload] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    loadRecargas();
  }, []);

  const loadRecargas = async () => {
    try {
      const data = await soatAPI.listarRecargas();
      setRecargas(data);
    } catch (error) {
      console.error('Error al cargar recargas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setError('El archivo debe ser PDF, JPG o PNG');
        return;
      }
      // Validar tamaño (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo no debe superar 10MB');
        return;
      }
      setError('');
      setArchivo(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await soatAPI.crearRecarga(
        {
          monto: parseInt(formData.monto),
          referencia: formData.referencia || undefined,
          observaciones: formData.observaciones || undefined,
        },
        archivo || undefined
      );
      
      setShowModal(false);
      setFormData({ monto: '', referencia: '', observaciones: '' });
      setArchivo(null);
      loadRecargas();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al registrar recarga');
    }
  };

  const handleVerComprobante = (recarga: Recarga) => {
    if (recarga.documento_comprobante) {
      const url = soatAPI.getDocumentoComprobanteUrl(recarga.id);
      setComprobanteUrl(url);
      setSelectedRecarga(recarga);
      setShowComprobanteModal(true);
    }
  };

  const handleUploadComprobante = (recarga: Recarga) => {
    setSelectedRecarga(recarga);
    setArchivoUpload(null);
    setUploadError('');
    setShowUploadModal(true);
  };

  const handleFileUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError('El archivo debe ser PDF, JPG o PNG');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('El archivo no debe superar 10MB');
        return;
      }
      setUploadError('');
      setArchivoUpload(file);
    }
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivoUpload || !selectedRecarga) return;
    
    setUploadError('');
    try {
      await soatAPI.uploadComprobanteRecarga(selectedRecarga.id, archivoUpload);
      setShowUploadModal(false);
      setArchivoUpload(null);
      loadRecargas();
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Error al subir comprobante');
    }
  };

  if (loading) {
    return <div className="text-center py-10">Cargando...</div>;
  }

  // Lógica de paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRecargas = recargas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(recargas.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 flex-1 text-center tracking-tight">Recargas</h1>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
          >
            + Nueva Recarga
          </button>
        )}
      </div>

      <div className="bg-white shadow-xl overflow-hidden rounded-2xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Monto
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Referencia
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Observaciones
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Comprobante
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {recargas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No hay recargas registradas
                </td>
              </tr>
            ) : (
              currentRecargas.map((recarga) => (
                <tr key={recarga.id} className="hover:bg-green-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    {formatCurrency(recarga.monto)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {recarga.referencia || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {recarga.observaciones || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(recarga.fecha_recarga)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {recarga.documento_comprobante ? (
                      <button
                        onClick={() => handleVerComprobante(recarga)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium transition-colors duration-200"
                        title="Ver Comprobante"
                      >
                        📄 Ver
                      </button>
                    ) : isAdmin ? (
                      <button
                        onClick={() => handleUploadComprobante(recarga)}
                        className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 font-medium transition-colors duration-200"
                        title="Subir Comprobante"
                      >
                        📤 Subir
                      </button>
                    ) : (
                      <span className="text-gray-400 italic">Sin comprobante</span>
                    )}
                  </td>
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
            <span className="font-semibold">{Math.min(indexOfLastItem, recargas.length)}</span> de{' '}
            <span className="font-semibold">{recargas.length}</span> recargas
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

      {/* Modal Nueva Recarga */}
      {showModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)}></div>
            
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl transform transition-all max-w-lg w-full z-20">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">💰 Nueva Recarga</h3>
                  <button
                    onClick={() => setShowModal(false)}
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

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Monto *</label>
                    <input
                      type="number"
                      required
                      value={formData.monto}
                      onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="1000000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Referencia <span className="text-gray-400 font-normal">(Opcional)</span></label>
                    <input
                      type="text"
                      value={formData.referencia}
                      onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Número de transferencia"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Observaciones <span className="text-gray-400 font-normal">(Opcional)</span></label>
                    <textarea
                      value={formData.observaciones}
                      onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                      rows={3}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Detalles adicionales..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Comprobante <span className="text-gray-400 font-normal">(Opcional)</span>
                      <span className="text-gray-500 text-xs ml-2">(PDF, JPG, PNG - Máx. 10MB)</span>
                    </label>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/jpg,image/png"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all"
                    />
                    {archivo && (
                      <p className="mt-2 text-sm font-medium text-green-600">✓ {archivo.name}</p>
                    )}
                  </div>

                  <div className="flex space-x-4 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      💾 Registrar Recarga
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setArchivo(null);
                        setError('');
                      }}
                      className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all duration-200"
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

      {/* Modal Ver Comprobante */}
      {showComprobanteModal && selectedRecarga && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Comprobante - Recarga #{selectedRecarga.id}
                  </h3>
                  <button
                    onClick={() => setShowComprobanteModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>
                <div className="mt-2">
                  <iframe
                    src={comprobanteUrl}
                    className="w-full h-96"
                    title={`Comprobante recarga ${selectedRecarga.id}`}
                  />
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <a
                  href={comprobanteUrl}
                  download
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Descargar
                </a>
                <button
                  onClick={() => setShowComprobanteModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Subir Comprobante */}
      {showUploadModal && selectedRecarga && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm transition-opacity" onClick={() => setShowUploadModal(false)}></div>
            
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl transform transition-all max-w-lg w-full z-20">
              <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">📤 Subir Comprobante - Recarga #{selectedRecarga.id}</h3>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>
              </div>
              
              <div className="bg-white px-6 py-6">
                {uploadError && (
                  <div className="mb-4 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-md">
                    <p className="text-sm font-semibold text-red-800">❌ {uploadError}</p>
                  </div>
                )}

                <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-xl">
                  <p className="text-sm text-blue-800">
                    <strong>Monto:</strong> {formatCurrency(selectedRecarga.monto)}<br/>
                    <strong>Fecha:</strong> {formatDate(selectedRecarga.fecha_recarga)}
                  </p>
                </div>

                <form onSubmit={handleSubmitUpload} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Comprobante *
                      <span className="text-gray-500 text-xs ml-2">(PDF, JPG, PNG - Máx. 10MB)</span>
                    </label>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/jpg,image/png"
                      onChange={handleFileUploadChange}
                      required
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 transition-all"
                    />
                    {archivoUpload && (
                      <p className="mt-2 text-sm font-medium text-green-600">✓ {archivoUpload.name}</p>
                    )}
                  </div>

                  <div className="flex space-x-4 pt-4">
                    <button
                      type="submit"
                      disabled={!archivoUpload}
                      className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-3 rounded-xl hover:from-orange-700 hover:to-orange-800 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      📤 Subir Comprobante
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUploadModal(false);
                        setArchivoUpload(null);
                        setUploadError('');
                      }}
                      className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all duration-200"
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

export default Recargas;
