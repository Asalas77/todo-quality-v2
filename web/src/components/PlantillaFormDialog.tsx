import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import type {
  ChecklistTemplateDetail,
  ChecklistTemplateInput,
  ChecklistFrequency,
} from '../api/plantillas';
import { FRECUENCIA_LABEL } from '../api/plantillas';

const itemSchema = z.object({
  descripcion: z.string().min(1, 'Obligatoria').max(500),
  criticidad: z.enum(['BASICO', 'CRITICO']),
});

const schema = z.object({
  identificador: z.string().min(1, 'Obligatorio').max(50),
  nombre: z.string().min(2, 'Obligatorio').max(150),
  frecuencia: z.enum(['DIARIO', 'SEMANAL', 'BIMESTRAL', 'TRIMESTRAL']),
  vigencia: z.string().min(1, 'Obligatoria'),
  items: z.array(itemSchema).min(1, 'Agrega al menos un ítem'),
});

type FormValues = z.infer<typeof schema>;

const EMPTY_ITEM = { descripcion: '', criticidad: 'BASICO' as const };

interface PlantillaFormDialogProps {
  open: boolean;
  template: ChecklistTemplateDetail | null;
  onClose: () => void;
  onSubmit: (values: ChecklistTemplateInput) => Promise<void>;
}

export function PlantillaFormDialog({
  open,
  template,
  onClose,
  onSubmit,
}: PlantillaFormDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (open) {
      reset({
        identificador: template?.identificador ?? '',
        nombre: template?.nombre ?? '',
        frecuencia: template?.frecuencia ?? 'DIARIO',
        vigencia: template?.vigencia ?? '',
        items: template?.items.map((i) => ({
          descripcion: i.descripcion,
          criticidad: i.criticidad,
        })) ?? [EMPTY_ITEM],
      });
    }
  }, [open, template, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{template ? 'Editar plantilla' : 'Nueva plantilla'}</DialogTitle>
      <form onSubmit={submit} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Identificador"
                placeholder="DOC SG-07 V00"
                fullWidth
                error={!!errors.identificador}
                helperText={errors.identificador?.message}
                {...register('identificador')}
              />
              <FormControl fullWidth error={!!errors.frecuencia}>
                <InputLabel id="frecuencia-label">Frecuencia</InputLabel>
                <Select
                  labelId="frecuencia-label"
                  label="Frecuencia"
                  defaultValue={template?.frecuencia ?? 'DIARIO'}
                  {...register('frecuencia')}
                >
                  {(Object.keys(FRECUENCIA_LABEL) as ChecklistFrequency[]).map((f) => (
                    <MenuItem key={f} value={f}>
                      {FRECUENCIA_LABEL[f]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <TextField
              label="Nombre"
              error={!!errors.nombre}
              helperText={errors.nombre?.message}
              {...register('nombre')}
            />

            <TextField
              label="Vigente desde"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              error={!!errors.vigencia}
              helperText={errors.vigencia?.message}
              {...register('vigencia')}
            />

            <Divider />
            <Typography variant="subtitle2">Ítems</Typography>
            {errors.items?.message && (
              <Typography variant="caption" color="error">
                {errors.items.message}
              </Typography>
            )}

            <Stack spacing={1.5}>
              {fields.map((field, index) => (
                <Stack
                  key={field.id}
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'flex-start' }}
                >
                  <TextField
                    label={`Ítem ${index + 1}`}
                    fullWidth
                    size="small"
                    error={!!errors.items?.[index]?.descripcion}
                    helperText={errors.items?.[index]?.descripcion?.message}
                    {...register(`items.${index}.descripcion` as const)}
                  />
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel id={`criticidad-${index}-label`}>Criterio</InputLabel>
                    <Select
                      labelId={`criticidad-${index}-label`}
                      label="Criterio"
                      defaultValue={field.criticidad}
                      {...register(`items.${index}.criticidad` as const)}
                    >
                      <MenuItem value="BASICO">Básico</MenuItem>
                      <MenuItem value="CRITICO">Crítico</MenuItem>
                    </Select>
                  </FormControl>
                  <IconButton
                    size="small"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    sx={{ mt: 0.5 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>

            <Button
              startIcon={<AddIcon />}
              onClick={() => append(EMPTY_ITEM)}
              sx={{ alignSelf: 'flex-start' }}
            >
              Agregar ítem
            </Button>
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
