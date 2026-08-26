import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Divider,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AxiosError } from 'axios';
import { authApi } from '../api/auth';
import { isValidRut } from '../lib/rut';
import { AuthBackground } from '../components/AuthBackground';

const schema = z.object({
  empresaNombre: z.string().min(2, 'Obligatorio'),
  empresaRut: z.string().refine(isValidRut, 'RUT inválido'),
  adminNombre: z.string().min(2, 'Obligatorio'),
  adminApellido: z.string().min(2, 'Obligatorio'),
  adminEmail: z.string().email('Correo electrónico inválido'),
  password: z.string().min(10, 'Mínimo 10 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      // confirmPassword es solo del formulario: el backend valida con whitelist estricto
      // y rechaza cualquier campo que no declare su DTO.
      const { confirmPassword: _confirmPassword, ...request } = values;
      await authApi.register(request);
      navigate('/login', { state: { registered: true } });
    } catch (error) {
      const response = (error as AxiosError<{ message?: string }>).response;
      setServerError(response?.data?.message ?? 'No se pudo completar el registro.');
    }
  };

  return (
    <AuthBackground>
      <Card sx={{ width: 460, maxWidth: '100%', p: 2, borderRadius: 3, boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08)' }}>
        <CardContent>
          <Typography variant="h5" component="h1" sx={{ textAlign: 'center' }} gutterBottom>
            Registra tu empresa
          </Typography>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2}>
              {serverError && <Alert severity="error">{serverError}</Alert>}

              <Typography variant="subtitle2" color="text.secondary">
                Datos de la empresa
              </Typography>
              <TextField
                label="Nombre de la empresa"
                error={!!errors.empresaNombre}
                helperText={errors.empresaNombre?.message}
                {...register('empresaNombre')}
              />
              <TextField
                label="RUT de la empresa"
                placeholder="12.345.678-5"
                error={!!errors.empresaRut}
                helperText={errors.empresaRut?.message}
                {...register('empresaRut')}
              />

              <Divider />
              <Typography variant="subtitle2" color="text.secondary">
                Cuenta del administrador
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Nombre"
                  fullWidth
                  error={!!errors.adminNombre}
                  helperText={errors.adminNombre?.message}
                  {...register('adminNombre')}
                />
                <TextField
                  label="Apellido"
                  fullWidth
                  error={!!errors.adminApellido}
                  helperText={errors.adminApellido?.message}
                  {...register('adminApellido')}
                />
              </Stack>
              <TextField
                label="Correo electrónico"
                type="email"
                autoComplete="username"
                error={!!errors.adminEmail}
                helperText={errors.adminEmail?.message}
                {...register('adminEmail')}
              />
              <TextField
                label="Contraseña"
                type="password"
                autoComplete="new-password"
                error={!!errors.password}
                helperText={errors.password?.message}
                {...register('password')}
              />
              <TextField
                label="Repite la contraseña"
                type="password"
                autoComplete="new-password"
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />

              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
              </Button>

              <Typography variant="body2" sx={{ textAlign: 'center' }}>
                ¿Ya tienes cuenta?{' '}
                <Link component={RouterLink} to="/login">
                  Inicia sesión
                </Link>
              </Typography>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </AuthBackground>
  );
}
