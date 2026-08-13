import { Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { MainLayout } from '../components/MainLayout';
import { useAuth } from '../context/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <MainLayout>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Bienvenido
          </Typography>
          <Typography color="text.secondary" gutterBottom>
            Empresa: {user?.tenantNombre ?? '—'}
          </Typography>
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Permisos vigentes
          </Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            {user?.permissions.map((permission) => (
              <Chip key={permission} label={permission} size="small" />
            ))}
          </Stack>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
