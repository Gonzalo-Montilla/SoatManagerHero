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

  const navLinkClass = (path: string) =>
    `px-3 py-2 rounded-lg font-medium transition-all duration-200 text-sm md:text-base whitespace-nowrap ${
      isActive(path)
        ? 'bg-blue-900/70 shadow-lg'
        : 'text-blue-100 hover:bg-blue-700/80 hover:text-white'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-xl sticky top-0 z-50 border-b border-blue-500/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center space-x-4 md:space-x-6">
              <Link to="/" className="flex items-center space-x-2 md:space-x-3">
                <img src={logo} alt="Logo" className="h-12 md:h-14 w-auto rounded-lg border border-blue-300/30 shadow" />
                <span className="text-lg md:text-xl font-bold hidden sm:inline">SOAT Manager Hero</span>
              </Link>
              {usuario && (
                <div className="flex space-x-2 md:space-x-4 overflow-x-auto">
                  <Link to="/" className={navLinkClass('/')}>
                    Dashboard
                  </Link>
                  <Link to="/soats" className={navLinkClass('/soats')}>
                    SOATs
                  </Link>
                  <Link to="/recargas" className={navLinkClass('/recargas')}>
                    Recargas
                  </Link>
                  {isAdmin && (
                    <>
                      <Link to="/expedir" className={navLinkClass('/expedir')}>
                        Expedir
                      </Link>
                      <Link to="/usuarios" className={navLinkClass('/usuarios')}>
                        Usuarios
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs md:text-sm bg-blue-900/40 px-3 py-1.5 rounded-full border border-blue-300/20">
                {usuario?.nombre_completo} · {isAdmin ? 'Admin' : 'Cliente'}
              </span>
              <button
                onClick={handleLogout}
                className="bg-blue-900/60 hover:bg-blue-900 px-4 py-2 rounded-lg text-sm border border-blue-300/20"
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
