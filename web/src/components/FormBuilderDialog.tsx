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
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import type { FormDetail, FormFieldType, FormInput } from '../api/formularios';
import { FIELD_TYPE_LABEL, OPTION_FIELD_TYPES } from '../api/formularios';
import type { ChecklistFrequency } from '../api/plantillas';
import { FRECUENCIA_LABEL } from '../api/plantillas';

const fieldSchema = z
  .object({
    tipo: z.enum(['TEXTO_CORTO', 'TEXTO_LARGO', 'FECHA', 'RADIO', 'CHECKBOX', 'DESPLEGABLE', 'ARCHIVO', 'FOTO']),
    etiqueta: z.string().min(1, 'Obligatoria').max(300),
    requerido: z.boolean(),
    opcionesText: z.string(),
  })
  .refine(
    (field) =>
      !OPTION_FIELD_TYPES.includes(field.tipo) ||
      field.opcionesText.split('\n').map((o) => o.trim()).filter(Boolean).length > 0,
    { message: 'Agrega al menos una opción (una por línea)', path: ['opcionesText'] },
  );

const schema = z.object({
  identificador: z.string().min(1, 'Obligatorio').max(50),
  nombre: z.string().min(2, 'Obligatorio').max(150),
  descripcion: z.string().max(1000).optional(),
  frecuencia: z.enum(['DIARIO', 'SEMANAL', 'BIMESTRAL', 'TRIMESTRAL']),
  fields: z.array(fieldSchema).min(1, 'Agrega al menos un campo'),
});

type FormValues = z.infer<typeof schema>;

const EMPTY_FIELD = {
  tipo: 'TEXTO_CORTO' as FormFieldType,
  etiqueta: '',
  requerido: false,
  opcionesText: '',
};

function toFormInput(values: FormValues): FormInput {
  return {
    identificador: values.identificador,
    nombre: values.nombre,
    descripcion: values.descripcion || undefined,
    frecuencia: values.frecuencia,
    fields: values.fields.map((field) => ({
      tipo: field.tipo,
      etiqueta: field.etiqueta,
      requerido: field.requerido,
      opciones: OPTION_FIELD_TYPES.includes(field.tipo)
        ? field.opcionesText.split('\n').map((o) => o.trim()).filter(Boolean)
        : undefined,
    })),
  };
}

interface FormBuilderDialogProps {
  open: boolean;
  form: FormDetail | null;
  onClose: () => void;
  onSubmit: (values: FormInput) => Promise<void>;
}

export function FormBuilderDialog({ open, form, onClose, onSubmit }: FormBuilderDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const { fields, append, remove } = useFieldArray({ control, name: 'fields' });

  useEffect(() => {
    if (open) {
      reset({
        identificador: form?.identificador ?? '',
        nombre: form?.nombre ?? '',
        descripcion: form?.descripcion ?? '',
        frecuencia: form?.frecuencia ?? 'DIARIO',
        fields: form?.fields.map((f) => ({
          tipo: f.tipo,
          etiqueta: f.etiqueta,
          requerido: f.requerido,
          opcionesText: (f.opciones ?? []).join('\n'),
        })) ?? [EMPTY_FIELD],
      });
    }
  }, [open, form, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit(toFormInput(values));
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{form ? 'Editar formulario' : 'Nuevo formulario'}</DialogTitle>
      <form onSubmit={submit} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Identificador"
                placeholder="REC-01"
                fullWidth
                error={!!errors.identificador}
                helperText={errors.identificador?.message}
                {...register('identificador')}
              />
              <FormControl fullWidth error={!!errors.frecuencia}>
                <InputLabel id="form-frecuencia-label">Frecuencia</InputLabel>
                <Select
                  labelId="form-frecuencia-label"
                  label="Frecuencia"
                  defaultValue={form?.frecuencia ?? 'DIARIO'}
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
              label="Descripción (opcional)"
              multiline
              minRows={2}
              {...register('descripcion')}
            />

            <Divider />
            <Typography variant="subtitle2">Campos</Typography>
            {errors.fields?.message && (
              <Typography variant="caption" color="error">
                {errors.fields.message}
              </Typography>
            )}

            <Stack spacing={2}>
              {fields.map((field, index) => {
                const tipo = watch(`fields.${index}.tipo`);
                return (
                  <Stack
                    key={field.id}
                    spacing={1}
                    sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <TextField
                        label={`Campo ${index + 1}`}
                        fullWidth
                        size="small"
                        error={!!errors.fields?.[index]?.etiqueta}
                        helperText={errors.fields?.[index]?.etiqueta?.message}
                        sx={{ minWidth: 160, flex: '1 1 160px' }}
                        {...register(`fields.${index}.etiqueta` as const)}
                      />
                      <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel id={`tipo-${index}-label`}>Tipo</InputLabel>
                        <Select
                          labelId={`tipo-${index}-label`}
                          label="Tipo"
                          defaultValue={field.tipo}
                          {...register(`fields.${index}.tipo` as const)}
                        >
                          {(Object.keys(FIELD_TYPE_LABEL) as FormFieldType[]).map((t) => (
                            <MenuItem key={t} value={t}>
                              {FIELD_TYPE_LABEL[t]}
                            </MenuItem>
                          ))}
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

                    {OPTION_FIELD_TYPES.includes(tipo) && (
                      <TextField
                        label="Opciones (una por línea)"
                        multiline
                        minRows={2}
                        size="small"
                        error={!!errors.fields?.[index]?.opcionesText}
                        helperText={errors.fields?.[index]?.opcionesText?.message}
                        {...register(`fields.${index}.opcionesText` as const)}
                      />
                    )}

                    <FormControlLabel
                      control={<Switch size="small" {...register(`fields.${index}.requerido` as const)} />}
                      label="Obligatorio"
                    />
                  </Stack>
                );
              })}
            </Stack>

            <Button
              startIcon={<AddIcon />}
              onClick={() => append(EMPTY_FIELD)}
              sx={{ alignSelf: 'flex-start' }}
            >
              Agregar campo
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
