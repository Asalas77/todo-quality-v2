import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../context/AuthContext';
import { AuthBackground } from '../components/AuthBackground';
import { AxiosError } from 'axios';

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'El correo electrónico es obligatorio')
    .max(255, 'El correo electrónico es demasiado largo')
    .email('Ingresa un correo electrónico válido'),
  password: z
    .string()
    .min(1, 'La contraseña es obligatoria')
    .max(200, 'La contraseña es demasiado larga')
    .refine((value) => value.trim().length > 0, 'La contraseña no puede ser solo espacios en blanco'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const passwordWasReset = (location.state as { passwordReset?: boolean } | null)
    ?.passwordReset;

  // Solo aparece si el despliegue define estas variables (ej. el entorno de demo en
  // Render) — en un despliegue real nunca se configuran y el botón no se muestra.
  const demoEmail = import.meta.env.VITE_DEMO_EMAIL as string | undefined;
  const demoPassword = import.meta.env.VITE_DEMO_PASSWORD as string | undefined;

  const fillDemoCredentials = () => {
    setValue('email', demoEmail ?? '', { shouldValidate: true });
    setValue('password', demoPassword ?? '', { shouldValidate: true });
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await login(values);
      const from = (location.state as { from?: Location })?.from?.pathname ?? '/';
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
    <AuthBackground>
      <Card sx={{ width: 400, maxWidth: '100%', p: 2, borderRadius: 3, boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08)' }}>
        <CardContent>
          <Typography variant="h5" component="h1" sx={{ textAlign: 'center' }} gutterBottom>
            Bienvenido de nuevo
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center', mb: 3 }}
          >
            Inicia sesión para continuar
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
                slotProps={{ htmlInput: { maxLength: 255 } }}
                {...register('email')}
              />

              <TextField
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                error={!!errors.password}
                helperText={errors.password?.message}
                slotProps={{
                  htmlInput: { maxLength: 200 },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((prev) => !prev)}
                          edge="end"
                          size="small"
                          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                          {showPassword ? (
                            <VisibilityOffIcon fontSize="small" />
                          ) : (
                            <VisibilityIcon fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                {...register('password')}
              />

              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
              </Button>

              {demoEmail && demoPassword && (
                <Button variant="outlined" onClick={fillDemoCredentials} disabled={isSubmitting}>
                  Usar cuenta demo
                </Button>
              )}

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
    </AuthBackground>
  );
}
