import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SoatsList from './pages/SoatsList';
import ExpedirSoat from './pages/ExpedirSoat';
import Recargas from './pages/Recargas';
import Usuarios from './pages/Usuarios';
import Layout from './components/Layout';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { usuario, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return usuario ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/soats"
            element={
              <PrivateRoute>
                <SoatsList />
              </PrivateRoute>
            }
          />
          <Route
            path="/expedir"
            element={
              <PrivateRoute>
                <ExpedirSoat />
              </PrivateRoute>
            }
          />
          <Route
            path="/recargas"
            element={
              <PrivateRoute>
                <Recargas />
              </PrivateRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <PrivateRoute>
                <Usuarios />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
