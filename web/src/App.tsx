import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { CentrosPage } from './pages/CentrosPage';
import { PlantillasPage } from './pages/PlantillasPage';
import { InspeccionesPage } from './pages/InspeccionesPage';
import { CompletarInspeccionPage } from './pages/CompletarInspeccionPage';
import { AgendaPage } from './pages/AgendaPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { RolesPage } from './pages/RolesPage';
import { ReportesPage } from './pages/ReportesPage';
import { OlvideContrasenaPage } from './pages/OlvideContrasenaPage';
import { RestablecerContrasenaPage } from './pages/RestablecerContrasenaPage';
import { PerfilPage } from './pages/PerfilPage';
import { FormulariosPage } from './pages/FormulariosPage';
import { CompletarFormularioPage } from './pages/CompletarFormularioPage';
import { FormularioRespuestasPage } from './pages/FormularioRespuestasPage';

const theme = createTheme({
  palette: { primary: { main: '#004E89' }, secondary: { main: '#e97304' } },
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registro" element={<RegisterPage />} />
              <Route path="/olvide-contrasena" element={<OlvideContrasenaPage />} />
              <Route
                path="/restablecer-contrasena"
                element={<RestablecerContrasenaPage />}
              />
              <Route
                path="/inicio"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/centros"
                element={
                  <ProtectedRoute>
                    <CentrosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/plantillas"
                element={
                  <ProtectedRoute>
                    <PlantillasPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inspecciones"
                element={
                  <ProtectedRoute>
                    <InspeccionesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inspecciones/:id"
                element={
                  <ProtectedRoute>
                    <CompletarInspeccionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/agenda"
                element={
                  <ProtectedRoute>
                    <AgendaPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/usuarios"
                element={
                  <ProtectedRoute>
                    <UsuariosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/roles"
                element={
                  <ProtectedRoute>
                    <RolesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reportes"
                element={
                  <ProtectedRoute>
                    <ReportesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/perfil"
                element={
                  <ProtectedRoute>
                    <PerfilPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/formularios"
                element={
                  <ProtectedRoute>
                    <FormulariosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/formularios/:id/completar"
                element={
                  <ProtectedRoute>
                    <CompletarFormularioPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/formularios/:id/respuestas"
                element={
                  <ProtectedRoute>
                    <FormularioRespuestasPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/inicio" replace />} />
              <Route path="*" element={<Navigate to="/inicio" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
