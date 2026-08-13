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
import { centrosApi } from '../api/centros';
import type { Centro } from '../api/centros';
import { plantillasApi } from '../api/plantillas';
import type { ChecklistTemplateSummary } from '../api/plantillas';
import { agendaApi } from '../api/agenda';
import type { CreateScheduleInput } from '../api/agenda';

const schema = z.object({
  templateId: z.string().min(1, 'Selecciona una plantilla'),
  centroId: z.string().min(1, 'Selecciona un centro'),
  fecha: z.string().min(1, 'Obligatoria'),
  asunto: z.string().optional(),
});

interface CreateScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateScheduleDialog({ open, onClose, onCreated }: CreateScheduleDialogProps) {
  const [templates, setTemplates] = useState<ChecklistTemplateSummary[]>([]);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateScheduleInput>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    reset({ templateId: '', centroId: '', fecha: '', asunto: '' });
    Promise.all([plantillasApi.list(false), centrosApi.list(false)]).then(
      ([templateList, centroList]) => {
        setTemplates(templateList);
        setCentros(centroList);
      },
    );
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await agendaApi.create(values);
      onCreated();
    } catch (error) {
      const response = (error as AxiosError<{ message?: string | string[] }>).response;
      const message = response?.data?.message;
      setServerError(Array.isArray(message) ? message.join(', ') : message ?? 'Error inesperado.');
    }
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Programar inspección</DialogTitle>
      <form onSubmit={submit} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {serverError && <Alert severity="error">{serverError}</Alert>}

            <FormControl fullWidth error={!!errors.templateId}>
              <InputLabel id="sched-template-label">Plantilla</InputLabel>
              <Select
                labelId="sched-template-label"
                label="Plantilla"
                defaultValue=""
                {...register('templateId')}
              >
                {templates.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.identificador} — {t.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth error={!!errors.centroId}>
              <InputLabel id="sched-centro-label">Centro</InputLabel>
              <Select
                labelId="sched-centro-label"
                label="Centro"
                defaultValue=""
                {...register('centroId')}
              >
                {centros.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Fecha"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              error={!!errors.fecha}
              helperText={errors.fecha?.message}
              {...register('fecha')}
            />

            <TextField label="Título (opcional)" multiline minRows={2} {...register('asunto')} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Agendando…' : 'Agendar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
