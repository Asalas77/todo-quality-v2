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
  ListSubheader,
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
import { formulariosApi } from '../api/formularios';
import type { FormSummary } from '../api/formularios';
import { agendaApi } from '../api/agenda';

/**
 * El select combina checklists y formularios en una sola lista agrupada. El valor lleva
 * el tipo como prefijo ("CHECKLIST:<id>") para saber en qué campo mandarlo al backend,
 * que espera templateId o formId, nunca ambos.
 */
const schema = z.object({
  target: z.string().min(1, 'Selecciona un checklist o formulario'),
  centroId: z.string().min(1, 'Selecciona un centro'),
  fecha: z.string().min(1, 'Obligatoria'),
  asunto: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateScheduleDialog({ open, onClose, onCreated }: CreateScheduleDialogProps) {
  const [templates, setTemplates] = useState<ChecklistTemplateSummary[]>([]);
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    reset({ target: '', centroId: '', fecha: '', asunto: '' });
    Promise.all([
      plantillasApi.list(false),
      centrosApi.list(false),
      // Un usuario sin permiso de formularios sigue pudiendo agendar checklists.
      formulariosApi.list(false).catch(() => [] as FormSummary[]),
    ]).then(([templateList, centroList, formList]) => {
      setTemplates(templateList);
      setCentros(centroList);
      setForms(formList);
    });
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    const [tipo, id] = values.target.split(':');
    try {
      await agendaApi.create({
        templateId: tipo === 'CHECKLIST' ? id : undefined,
        formId: tipo === 'FORMULARIO' ? id : undefined,
        centroId: values.centroId,
        fecha: values.fecha,
        asunto: values.asunto,
      });
      onCreated();
    } catch (error) {
      const response = (error as AxiosError<{ message?: string | string[] }>).response;
      const message = response?.data?.message;
      setServerError(Array.isArray(message) ? message.join(', ') : message ?? 'Error inesperado.');
    }
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Programar</DialogTitle>
      <form onSubmit={submit} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {serverError && <Alert severity="error">{serverError}</Alert>}

            <FormControl fullWidth error={!!errors.target}>
              <InputLabel id="sched-target-label">Checklist o formulario</InputLabel>
              <Select
                labelId="sched-target-label"
                label="Checklist o formulario"
                defaultValue=""
                {...register('target')}
              >
                {templates.length > 0 && <ListSubheader>Checklists</ListSubheader>}
                {templates.map((t) => (
                  <MenuItem key={t.id} value={`CHECKLIST:${t.id}`}>
                    {t.identificador} — {t.nombre}
                  </MenuItem>
                ))}
                {forms.length > 0 && <ListSubheader>Formularios</ListSubheader>}
                {forms.map((f) => (
                  <MenuItem key={f.id} value={`FORMULARIO:${f.id}`}>
                    {f.nombre}
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
