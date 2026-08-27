import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ListItemIcon,
  ListItemText,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DescriptionIcon from '@mui/icons-material/Description';
import { AxiosError } from 'axios';
import { centrosApi } from '../api/centros';
import type { Centro } from '../api/centros';
import { plantillasApi } from '../api/plantillas';
import type { ChecklistTemplateSummary } from '../api/plantillas';
import { formulariosApi } from '../api/formularios';
import type { FormSummary } from '../api/formularios';
import { inspeccionesApi } from '../api/inspecciones';

/**
 * El select combina checklists y formularios en una sola lista agrupada, igual que en
 * Agenda. El valor lleva el tipo como prefijo ("CHECKLIST:<id>" / "FORMULARIO:<id>").
 */
const schema = z
  .object({
    target: z.string().min(1, 'Selecciona un checklist o formulario'),
    centroId: z.string(),
    fecha: z.string(),
  })
  .refine((data) => data.target.startsWith('FORMULARIO:') || data.centroId.length > 0, {
    message: 'Selecciona un centro',
    path: ['centroId'],
  })
  .refine((data) => data.target.startsWith('FORMULARIO:') || data.fecha.length > 0, {
    message: 'Obligatoria',
    path: ['fecha'],
  });

type FormValues = z.infer<typeof schema>;

interface StartInspectionDialogProps {
  open: boolean;
  onClose: () => void;
  onStarted: (inspectionId: string) => void;
}

export function StartInspectionDialog({
  open,
  onClose,
  onStarted,
}: StartInspectionDialogProps) {
  const navigate = useNavigate();
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
    reset({ target: '', centroId: '', fecha: new Date().toISOString().slice(0, 10) });
    Promise.all([
      plantillasApi.list(false),
      centrosApi.list(false),
      // Un usuario sin permiso de formularios sigue pudiendo iniciar inspecciones.
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

    // Un formulario no tiene "borrador" progresivo como una inspección: se completa y se
    // envía en un solo paso, así que acá solo navega a completarlo — no llama a start().
    if (tipo === 'FORMULARIO') {
      onClose();
      navigate(`/formularios/${id}/completar`);
      return;
    }

    try {
      const inspection = await inspeccionesApi.start({
        templateId: id,
        centroId: values.centroId,
        fecha: values.fecha,
      });
      onStarted(inspection.id);
    } catch (error) {
      const response = (error as AxiosError<{ message?: string | string[] }>).response;
      const message = response?.data?.message;
      setServerError(Array.isArray(message) ? message.join(', ') : message ?? 'Error inesperado.');
    }
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Nueva inspección o formulario</DialogTitle>
      <form onSubmit={submit} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {serverError && <Alert severity="error">{serverError}</Alert>}

            <FormControl fullWidth error={!!errors.target}>
              <InputLabel id="target-label">Checklist o formulario</InputLabel>
              <Select
                labelId="target-label"
                label="Checklist o formulario"
                defaultValue=""
                {...register('target')}
              >
                {templates.length > 0 && <ListSubheader>Checklists</ListSubheader>}
                {templates.map((t) => (
                  <MenuItem key={t.id} value={`CHECKLIST:${t.id}`}>
                    <ListItemIcon>
                      <AssignmentIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={`${t.identificador} — ${t.nombre}`} />
                  </MenuItem>
                ))}
                {forms.length > 0 && <ListSubheader>Formularios</ListSubheader>}
                {forms.map((f) => (
                  <MenuItem key={f.id} value={`FORMULARIO:${f.id}`}>
                    <ListItemIcon>
                      <DescriptionIcon fontSize="small" color="secondary" />
                    </ListItemIcon>
                    <ListItemText primary={`${f.identificador} — ${f.nombre}`} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth error={!!errors.centroId}>
              <InputLabel id="centro-label">Centro</InputLabel>
              <Select labelId="centro-label" label="Centro" defaultValue="" {...register('centroId')}>
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Iniciando…' : 'Iniciar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
