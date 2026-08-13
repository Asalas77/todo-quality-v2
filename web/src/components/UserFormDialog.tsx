import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { AxiosError } from 'axios';
import type { User } from '../api/usuarios';
import type { Role } from '../api/roles';

const createSchema = z.object({
  nombre: z.string().min(2, 'Obligatorio').max(100),
  apellido: z.string().min(2, 'Obligatorio').max(100),
  email: z.string().email('Correo electrónico inválido'),
  rut: z.string().optional(),
  roleId: z.string().min(1, 'Selecciona un rol'),
});

type FormValues = z.infer<typeof createSchema>;

interface UserFormDialogProps {
  open: boolean;
  user: User | null;
  roles: Role[];
  onClose: () => void;
  onSubmit: (values: FormValues) => Promise<void>;
}

export function UserFormDialog({ open, user, roles, onClose, onSubmit }: UserFormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(createSchema) });

  useEffect(() => {
    if (open) {
      setServerError(null);
      reset({
        nombre: user?.nombre ?? '',
        apellido: user?.apellido ?? '',
        email: user?.email ?? '',
        rut: user?.rut ?? '',
        roleId: user?.roleId ?? '',
      });
    }
  }, [open, user, reset]);

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      const response = (error as AxiosError<{ message?: string | string[] }>).response;
      const message = response?.data?.message;
      setServerError(Array.isArray(message) ? message.join(', ') : message ?? 'Error inesperado.');
    }
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{user ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
      <form onSubmit={submit} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {serverError && <Alert severity="error">{serverError}</Alert>}

            <Stack direction="row" spacing={2}>
              <TextField
                label="Nombre"
                fullWidth
                error={!!errors.nombre}
                helperText={errors.nombre?.message}
                {...register('nombre')}
              />
              <TextField
                label="Apellido"
                fullWidth
                error={!!errors.apellido}
                helperText={errors.apellido?.message}
                {...register('apellido')}
              />
            </Stack>

            <TextField
              label="Correo electrónico"
              type="email"
              disabled={!!user}
              helperText={user ? 'El correo no se puede modificar' : errors.email?.message}
              error={!!errors.email}
              {...register('email')}
            />

            <TextField label="RUT (opcional)" {...register('rut')} />

            <FormControl fullWidth error={!!errors.roleId}>
              <InputLabel id="user-role-label">Rol</InputLabel>
              <Select
                labelId="user-role-label"
                label="Rol"
                defaultValue={user?.roleId ?? ''}
                {...register('roleId')}
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
