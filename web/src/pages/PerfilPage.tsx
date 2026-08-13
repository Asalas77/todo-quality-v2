import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AxiosError } from 'axios';
import { MainLayout } from '../components/MainLayout';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresa tu contraseña actual'),
    newPassword: z.string().min(10, 'Mínimo 10 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export function PerfilPage() {
  const { user, logout } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await authApi.changePassword(values.currentPassword, values.newPassword);
      setDone(true);
      reset();
    } catch (error) {
      const response = (error as AxiosError<{ message?: string | string[] }>).response;
      const message = response?.data?.message;
      setServerError(Array.isArray(message) ? message.join(', ') : message ?? 'No se pudo cambiar la contraseña.');
    }
  };

  if (done) {
    // Cambiar la contraseña revoca todas las sesiones (incluida esta): hay que volver a
    // iniciar sesión con la nueva.
    return (
      <MainLayout>
        <Card sx={{ p: 3, maxWidth: 480 }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            Contraseña actualizada. Por seguridad, cerramos tu sesión — inicia sesión de
            nuevo con tu nueva contraseña.
          </Alert>
          <Button variant="contained" onClick={() => logout()}>
            Ir a iniciar sesión
          </Button>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Stack spacing={2} sx={{ maxWidth: 480 }}>
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Mi perfil
            </Typography>
            <Typography color="text.secondary">Empresa: {user?.tenantNombre ?? '—'}</Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mt: 2 }}>
              {user?.permissions.map((permission) => (
                <Chip key={permission} label={permission} size="small" />
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Cambiar contraseña
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <Stack spacing={2}>
                {serverError && <Alert severity="error">{serverError}</Alert>}

                <TextField
                  label="Contraseña actual"
                  type="password"
                  autoComplete="current-password"
                  error={!!errors.currentPassword}
                  helperText={errors.currentPassword?.message}
                  {...register('currentPassword')}
                />
                <TextField
                  label="Nueva contraseña"
                  type="password"
                  autoComplete="new-password"
                  error={!!errors.newPassword}
                  helperText={errors.newPassword?.message}
                  {...register('newPassword')}
                />
                <TextField
                  label="Repite la nueva contraseña"
                  type="password"
                  autoComplete="new-password"
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />

                <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ alignSelf: 'flex-start' }}>
                  {isSubmitting ? 'Guardando…' : 'Cambiar contraseña'}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Stack>
    </MainLayout>
  );
}
