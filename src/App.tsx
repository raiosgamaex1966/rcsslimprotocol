import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/dashboard/Dashboard';
import AdminPanel from './pages/admin/AdminPanel';
import InstallPrompt from './components/InstallPrompt';
import ProfessionalRegister from './pages/ProfessionalRegister';
import ProfessionalPortal from './pages/professional/ProfessionalPortal';
import MedicalReport from './pages/MedicalReport';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/login"
            element={
              <PublicOnly>
                <Login />
              </PublicOnly>
            }
          />
          <Route
            path="/cadastro"
            element={
              <PublicOnly>
                <Register />
              </PublicOnly>
            }
          />
          <Route path="/verificar-email" element={<VerifyEmail />} />
          <Route path="/recuperar-senha" element={<ForgotPassword />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route
            path="/profissional/cadastro"
            element={
              <PublicOnly>
                <ProfessionalRegister />
              </PublicOnly>
            }
          />
          <Route
            path="/profissional"
            element={
              <Protected>
                <ProfessionalPortal />
              </Protected>
            }
          />
          <Route
            path="/app"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />
          <Route
            path="/relatorio-consulta"
            element={
              <Protected>
                <MedicalReport />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <InstallPrompt />
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
