import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logoSoatManagerHero.jpeg';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { usuario, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-24">
            <div className="flex items-center space-x-4 md:space-x-8">
              <Link to="/" className="flex items-center space-x-2 md:space-x-3">
                <img src={logo} alt="Logo" className="h-16 md:h-20 w-auto rounded-lg" />
                <span className="text-lg md:text-xl font-bold hidden sm:inline">SOAT Manager Hero</span>
              </Link>
              {usuario && (
                <div className="flex space-x-2 md:space-x-4 overflow-x-auto">
                  <Link 
                    to="/" 
                    className={`px-2 md:px-3 py-2 rounded-md font-medium transition-all duration-200 text-sm md:text-base whitespace-nowrap ${
                      isActive('/') 
                        ? 'bg-blue-800 shadow-lg' 
                        : 'hover:bg-blue-700'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    to="/soats" 
                    className={`px-2 md:px-3 py-2 rounded-md font-medium transition-all duration-200 text-sm md:text-base whitespace-nowrap ${
                      isActive('/soats') 
                        ? 'bg-blue-800 shadow-lg' 
                        : 'hover:bg-blue-700'
                    }`}
                  >
                    SOATs
                  </Link>
                  <Link 
                    to="/recargas" 
                    className={`px-2 md:px-3 py-2 rounded-md font-medium transition-all duration-200 text-sm md:text-base whitespace-nowrap ${
                      isActive('/recargas') 
                        ? 'bg-blue-800 shadow-lg' 
                        : 'hover:bg-blue-700'
                    }`}
                  >
                    Recargas
                  </Link>
                  {isAdmin && (
                    <>
                      <Link 
                        to="/expedir" 
                        className={`px-2 md:px-3 py-2 rounded-md font-medium transition-all duration-200 text-sm md:text-base whitespace-nowrap ${
                          isActive('/expedir') 
                            ? 'bg-blue-800 shadow-lg' 
                            : 'hover:bg-blue-700'
                        }`}
                      >
                        Expedir
                      </Link>
                      <Link 
                        to="/usuarios" 
                        className={`px-2 md:px-3 py-2 rounded-md font-medium transition-all duration-200 text-sm md:text-base whitespace-nowrap ${
                          isActive('/usuarios') 
                            ? 'bg-blue-800 shadow-lg' 
                            : 'hover:bg-blue-700'
                        }`}
                      >
                        Usuarios
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm">
                {usuario?.nombre_completo} ({isAdmin ? 'Admin' : 'Cliente'})
              </span>
              <button
                onClick={handleLogout}
                className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-md text-sm"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
