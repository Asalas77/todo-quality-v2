import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AxiosError } from 'axios';
import type { Permission, Role } from '../api/roles';

const schema = z.object({
  nombre: z.string().min(2, 'Obligatorio').max(100),
  descripcion: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface RoleFormDialogProps {
  open: boolean;
  role: Role | null;
  permissions: Permission[];
  onClose: () => void;
  onSubmit: (values: FormValues & { permissionCodes: string[] }) => Promise<void>;
}

export function RoleFormDialog({
  open,
  role,
  permissions,
  onClose,
  onSubmit,
}: RoleFormDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      setServerError(null);
      reset({ nombre: role?.nombre ?? '', descripcion: role?.descripcion ?? '' });
      setSelected(new Set(role?.permissionCodes ?? []));
    }
  }, [open, role, reset]);

  const groups = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const permission of permissions) {
      const group = permission.code.split('.')[0];
      const list = map.get(group) ?? [];
      list.push(permission);
      map.set(group, list);
    }
    return map;
  }, [permissions]);

  const togglePermission = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await onSubmit({ ...values, permissionCodes: Array.from(selected) });
    } catch (error) {
      const response = (error as AxiosError<{ message?: string | string[] }>).response;
      const message = response?.data?.message;
      setServerError(Array.isArray(message) ? message.join(', ') : message ?? 'Error inesperado.');
    }
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{role ? 'Editar rol' : 'Nuevo rol'}</DialogTitle>
      <form onSubmit={submit} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {serverError && <Alert severity="error">{serverError}</Alert>}

            <TextField
              label="Nombre"
              disabled={role?.esSistema}
              helperText={
                role?.esSistema ? 'Los roles de sistema no se pueden renombrar' : errors.nombre?.message
              }
              error={!!errors.nombre}
              {...register('nombre')}
            />

            <TextField label="Descripción (opcional)" multiline minRows={2} {...register('descripcion')} />

            <Typography variant="subtitle2">Permisos</Typography>
            <Stack spacing={1.5}>
              {Array.from(groups.entries()).map(([group, items]) => (
                <div key={group}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                    {group}
                  </Typography>
                  <Stack sx={{ pl: 1 }}>
                    {items.map((permission) => (
                      <FormControlLabel
                        key={permission.code}
                        control={
                          <Checkbox
                            size="small"
                            checked={selected.has(permission.code)}
                            onChange={() => togglePermission(permission.code)}
                          />
                        }
                        label={permission.descripcion}
                      />
                    ))}
                  </Stack>
                </div>
              ))}
            </Stack>
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
