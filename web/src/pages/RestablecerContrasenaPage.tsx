import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AxiosError } from 'axios';
import { authApi } from '../api/auth';

const schema = z
  .object({
    newPassword: z.string().min(10, 'Mínimo 10 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export function RestablecerContrasenaPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    if (!token) return;
    setServerError(null);
    try {
      await authApi.resetPassword(token, values.newPassword);
      navigate('/login', { state: { passwordReset: true } });
    } catch (error) {
      const response = (error as AxiosError<{ message?: string }>).response;
      setServerError(response?.data?.message ?? 'No se pudo restablecer la contraseña.');
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.100',
      }}
    >
      <Card sx={{ width: 420, p: 2 }}>
        <CardContent>
          <Typography variant="h5" component="h1" sx={{ textAlign: 'center' }} gutterBottom>
            Restablecer contraseña
          </Typography>

          {!token ? (
            <Stack spacing={2}>
              <Alert severity="error">
                Este enlace no es válido. Solicita uno nuevo desde "Olvidé mi
                contraseña".
              </Alert>
              <Typography variant="body2" sx={{ textAlign: 'center' }}>
                <Link component={RouterLink} to="/olvide-contrasena">
                  Solicitar enlace
                </Link>
              </Typography>
            </Stack>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Stack spacing={2}>
                {serverError && <Alert severity="error">{serverError}</Alert>}

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

                <Button type="submit" variant="contained" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando…' : 'Restablecer contraseña'}
                </Button>
              </Stack>
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
