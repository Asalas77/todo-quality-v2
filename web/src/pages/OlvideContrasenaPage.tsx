import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link as RouterLink } from 'react-router-dom';
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
import { authApi } from '../api/auth';

const schema = z.object({
  email: z.string().email('Correo electrónico inválido'),
});

type FormValues = z.infer<typeof schema>;

export function OlvideContrasenaPage() {
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    const result = await authApi.requestPasswordReset(values.email);
    setDevResetUrl(result.devResetUrl ?? null);
    setSent(true);
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
            Recuperar contraseña
          </Typography>

          {sent ? (
            <Stack spacing={2}>
              <Alert severity="success">
                Si el correo está registrado, se envió un enlace para restablecer la
                contraseña. Revisa tu bandeja de entrada.
              </Alert>

              {devResetUrl && (
                <Alert severity="warning">
                  Modo desarrollo (sin envío de correo configurado todavía):{' '}
                  <Link component={RouterLink} to={devResetUrl.replace(/^.*\/\/[^/]+/, '')}>
                    abrir enlace de recuperación
                  </Link>
                </Alert>
              )}

              <Typography variant="body2" sx={{ textAlign: 'center' }}>
                <Link component={RouterLink} to="/login">
                  Volver a iniciar sesión
                </Link>
              </Typography>
            </Stack>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  Ingresa tu correo electrónico y te enviaremos un enlace para
                  restablecer tu contraseña.
                </Typography>

                <TextField
                  label="Correo electrónico"
                  type="email"
                  autoComplete="username"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  {...register('email')}
                />

                <Button type="submit" variant="contained" disabled={isSubmitting}>
                  {isSubmitting ? 'Enviando…' : 'Enviar enlace'}
                </Button>

                <Typography variant="body2" sx={{ textAlign: 'center' }}>
                  <Link component={RouterLink} to="/login">
                    Volver a iniciar sesión
                  </Link>
                </Typography>
              </Stack>
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
