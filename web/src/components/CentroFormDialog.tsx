import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import type { Centro, CentroInput } from '../api/centros';

const schema = z.object({
  nombre: z.string().min(2, 'Obligatorio').max(150),
  direccion: z.string().min(2, 'Obligatoria').max(255),
});

interface CentroFormDialogProps {
  open: boolean;
  centro: Centro | null;
  onClose: () => void;
  onSubmit: (values: CentroInput) => Promise<void>;
}

export function CentroFormDialog({
  open,
  centro,
  onClose,
  onSubmit,
}: CentroFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CentroInput>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset({ nombre: centro?.nombre ?? '', direccion: centro?.direccion ?? '' });
    }
  }, [open, centro, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{centro ? 'Editar centro' : 'Nuevo centro'}</DialogTitle>
      <form onSubmit={submit} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre"
              autoFocus
              error={!!errors.nombre}
              helperText={errors.nombre?.message}
              {...register('nombre')}
            />
            <TextField
              label="Dirección"
              error={!!errors.direccion}
              helperText={errors.direccion?.message}
              {...register('direccion')}
            />
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
