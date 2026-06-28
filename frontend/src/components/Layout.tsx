import React, { useEffect, useMemo, useState } from 'react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItems = useMemo(() => {
    const baseItems = [
      { path: '/', label: 'Dashboard' },
      { path: '/soats', label: 'SOATs' },
      { path: '/recargas', label: 'Recargas' },
    ];
    if (isAdmin) {
      baseItems.push(
        { path: '/expedir', label: 'Expedir' },
        { path: '/usuarios', label: 'Usuarios' }
      );
    }
    return baseItems;
  }, [isAdmin]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const isMobileViewport = window.innerWidth < 1024;
    if (mobileMenuOpen && isMobileViewport) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const navLinkClass = (path: string) =>
    `px-3 py-2 rounded-lg font-medium transition-all duration-200 text-sm md:text-base whitespace-nowrap ${
      isActive(path)
        ? 'bg-blue-900/70 shadow-lg text-white'
        : 'text-blue-100 hover:bg-blue-700/80 hover:text-white'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-xl sticky top-0 z-50 border-b border-blue-500/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-14 sm:h-16 md:h-20 flex items-center justify-between gap-3">
            <div className="flex items-center min-w-0">
              <Link to="/" className="flex items-center space-x-2 md:space-x-3 min-w-0">
                <img src={logo} alt="Logo" className="h-9 sm:h-10 md:h-14 w-auto rounded-lg border border-blue-300/30 shadow" />
                <span className="text-base md:text-xl font-bold truncate">SOAT Manager Hero</span>
              </Link>
              {usuario && (
                <div className="hidden lg:flex ml-5 items-center gap-2">
                  {navItems.map((item) => (
                    <Link key={item.path} to={item.path} className={navLinkClass(item.path)}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {usuario && (
              <div className="flex items-center gap-2 md:gap-3">
                <span className="hidden xl:inline text-xs md:text-sm bg-blue-900/40 px-3 py-1.5 rounded-full border border-blue-300/20">
                  {usuario?.nombre_completo} · {isAdmin ? 'Admin' : 'Cliente'}
                </span>
                <button
                  onClick={handleLogout}
                  className="hidden lg:inline-flex bg-blue-900/60 hover:bg-blue-900 px-4 py-2 rounded-lg text-sm border border-blue-300/20"
                >
                  Cerrar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  className="lg:hidden inline-flex items-center justify-center rounded-lg border border-blue-300/30 bg-blue-900/40 px-3 py-2"
                  aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                >
                  {mobileMenuOpen ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {usuario && (
          <div
            className={`lg:hidden border-t border-blue-400/40 bg-blue-700/95 px-4 space-y-2 overflow-hidden transition-all duration-300 ${
              mobileMenuOpen ? 'max-h-[28rem] py-3 opacity-100' : 'max-h-0 py-0 opacity-0'
            }`}
          >
            <p className="text-xs text-blue-100 bg-blue-900/40 px-3 py-2 rounded-lg border border-blue-300/20">
              {usuario?.nombre_completo} · {isAdmin ? 'Admin' : 'Cliente'}
            </p>
            <div className="grid gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive(item.path) ? 'bg-blue-900/70 text-white' : 'text-blue-50 hover:bg-blue-600'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={handleLogout}
                className="mt-1 px-3 py-2 rounded-lg text-left text-sm font-medium bg-blue-900/60 hover:bg-blue-900"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </nav>
      <main className="max-w-7xl mx-auto py-4 sm:py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
