import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
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
import { useAuth } from '../context/AuthContext';
import { AxiosError } from 'axios';

const schema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const passwordWasReset = (location.state as { passwordReset?: boolean } | null)
    ?.passwordReset;

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await login(values);
      const from = (location.state as { from?: Location })?.from?.pathname ?? '/inicio';
      navigate(from, { replace: true });
    } catch (error) {
      const status = (error as AxiosError).response?.status;
      setServerError(
        status === 401
          ? 'Correo o contraseña incorrectos.'
          : 'No se pudo iniciar sesión. Intenta de nuevo.',
      );
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
      <Card sx={{ width: 400, p: 2 }}>
        <CardContent>
          <Typography variant="h5" component="h1" sx={{ textAlign: 'center' }} gutterBottom>
            TO DO QUALITY
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center', mb: 3 }}
          >
            Inicio de sesión
          </Typography>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2}>
              {passwordWasReset && (
                <Alert severity="success">
                  Contraseña actualizada. Inicia sesión con tu nueva contraseña.
                </Alert>
              )}
              {serverError && <Alert severity="error">{serverError}</Alert>}

              <TextField
                label="Correo electrónico"
                type="email"
                autoComplete="username"
                error={!!errors.email}
                helperText={errors.email?.message}
                {...register('email')}
              />

              <TextField
                label="Contraseña"
                type="password"
                autoComplete="current-password"
                error={!!errors.password}
                helperText={errors.password?.message}
                {...register('password')}
              />

              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
              </Button>

              <Typography variant="body2" sx={{ textAlign: 'center' }}>
                <Link component={RouterLink} to="/olvide-contrasena">
                  ¿Olvidaste tu contraseña?
                </Link>
              </Typography>

              <Typography variant="body2" sx={{ textAlign: 'center' }}>
                ¿No tienes cuenta?{' '}
                <Link component={RouterLink} to="/registro">
                  Registra tu empresa
                </Link>
              </Typography>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
