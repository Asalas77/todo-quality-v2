import type { ReactNode } from 'react';
import { AppBar, Box, Button, Stack, Toolbar, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function MainLayout({ children }: { children: ReactNode }) {
  const { logout, hasPermission, user } = useAuth();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="static" color="primary" enableColorOnDark className="no-print">
        <Toolbar>
          <Stack
            component={RouterLink}
            to="/inicio"
            sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}
          >
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              TO DO QUALITY
            </Typography>
            {user?.tenantNombre && (
              <Typography variant="caption" sx={{ opacity: 0.8, lineHeight: 1 }}>
                {user.tenantNombre}
              </Typography>
            )}
          </Stack>
          <Button color="inherit" component={RouterLink} to="/centros">
            Centros
          </Button>
          <Button color="inherit" component={RouterLink} to="/plantillas">
            Plantillas
          </Button>
          <Button color="inherit" component={RouterLink} to="/inspecciones">
            Inspecciones
          </Button>
          <Button color="inherit" component={RouterLink} to="/agenda">
            Agenda
          </Button>
          {hasPermission('reportes.ver') && (
            <Button color="inherit" component={RouterLink} to="/reportes">
              Reportes
            </Button>
          )}
          {hasPermission('formularios.ver') && (
            <Button color="inherit" component={RouterLink} to="/formularios">
              Formularios
            </Button>
          )}
          {hasPermission('usuarios.ver') && (
            <Button color="inherit" component={RouterLink} to="/usuarios">
              Usuarios
            </Button>
          )}
          {hasPermission('roles.gestionar') && (
            <Button color="inherit" component={RouterLink} to="/roles">
              Roles
            </Button>
          )}
          <Button color="inherit" component={RouterLink} to="/perfil">
            Perfil
          </Button>
          <Button color="inherit" onClick={() => logout()}>
            Cerrar sesión
          </Button>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ p: 3 }}>
        {children}
      </Box>
    </Box>
  );
}
