import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import ShortTextIcon from '@mui/icons-material/ShortText';
import NotesIcon from '@mui/icons-material/Notes';
import EventIcon from '@mui/icons-material/Event';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import ArrowDropDownCircleIcon from '@mui/icons-material/ArrowDropDownCircle';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { SortableFormField } from './SortableFormField';
import type { FormDetail, FormFieldType, FormInput } from '../api/formularios';
import { FIELD_TYPE_LABEL, OPTION_FIELD_TYPES } from '../api/formularios';
import type { ChecklistFrequency } from '../api/plantillas';
import { FRECUENCIA_LABEL } from '../api/plantillas';

const FIELD_TYPE_ICON: Record<FormFieldType, typeof ShortTextIcon> = {
  TEXTO_CORTO: ShortTextIcon,
  TEXTO_LARGO: NotesIcon,
  FECHA: EventIcon,
  RADIO: RadioButtonCheckedIcon,
  CHECKBOX: CheckBoxIcon,
  DESPLEGABLE: ArrowDropDownCircleIcon,
  ARCHIVO: AttachFileIcon,
  FOTO: PhotoCameraIcon,
};

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

function emptyField(tipo: FormFieldType) {
  return {
    tipo,
    etiqueta: '',
    requerido: false,
    opcionesText: OPTION_FIELD_TYPES.includes(tipo) ? 'Opción 1\nOpción 2' : '',
  };
}

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

interface FormBuilderDialogV2Props {
  open: boolean;
  form: FormDetail | null;
  onClose: () => void;
  onSubmit: (values: FormInput) => Promise<void>;
}

export function FormBuilderDialogV2({ open, form, onClose, onSubmit }: FormBuilderDialogV2Props) {
  const [tab, setTab] = useState<'editar' | 'preview'>('editar');

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const { fields, append, remove, move } = useFieldArray({ control, name: 'fields' });
  const watchedFields = watch('fields');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (open) {
      setTab('editar');
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
        })) ?? [emptyField('TEXTO_CORTO')],
      });
    }
  }, [open, form, reset]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) move(oldIndex, newIndex);
  };

  const submit = handleSubmit(async (values) => {
    await onSubmit(toFormInput(values));
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{form ? 'Editar formulario' : 'Nuevo formulario'} · Builder v2</DialogTitle>
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
                <InputLabel id="form-v2-frecuencia-label">Frecuencia</InputLabel>
                <Select
                  labelId="form-v2-frecuencia-label"
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

            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab value="editar" label="Editar campos" />
              <Tab value="preview" label="Vista previa" />
            </Tabs>

            {tab === 'editar' && (
              <>
                <Typography variant="subtitle2">Agregar campo</Typography>
                <Grid container spacing={1}>
                  {(Object.keys(FIELD_TYPE_LABEL) as FormFieldType[]).map((t) => {
                    const Icon = FIELD_TYPE_ICON[t];
                    return (
                      <Grid key={t} size={{ xs: 6, sm: 4, md: 3 }}>
                        <Button
                          fullWidth
                          size="small"
                          variant="outlined"
                          startIcon={<Icon fontSize="small" />}
                          onClick={() => append(emptyField(t))}
                          sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                        >
                          {FIELD_TYPE_LABEL[t]}
                        </Button>
                      </Grid>
                    );
                  })}
                </Grid>

                <Divider />
                <Typography variant="subtitle2">
                  Campos del formulario
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    arrastra el asa para reordenar
                  </Typography>
                </Typography>
                {errors.fields?.message && (
                  <Typography variant="caption" color="error">
                    {errors.fields.message}
                  </Typography>
                )}

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                    <Stack spacing={1.5}>
                      {fields.map((field, index) => {
                        const tipo = watch(`fields.${index}.tipo`);
                        return (
                          <SortableFormField
                            key={field.id}
                            id={field.id}
                            onDelete={() => remove(index)}
                            deleteDisabled={fields.length === 1}
                          >
                            <Stack spacing={1}>
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
                                  <InputLabel id={`v2-tipo-${index}-label`}>Tipo</InputLabel>
                                  <Select
                                    labelId={`v2-tipo-${index}-label`}
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
                                control={
                                  <Switch size="small" {...register(`fields.${index}.requerido` as const)} />
                                }
                                label="Obligatorio"
                              />
                            </Stack>
                          </SortableFormField>
                        );
                      })}
                    </Stack>
                  </SortableContext>
                </DndContext>
              </>
            )}

            {tab === 'preview' && (
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Stack spacing={2.5}>
                  {(watchedFields ?? []).map((field, index) => {
                    const opciones = field.opcionesText
                      .split('\n')
                      .map((o) => o.trim())
                      .filter(Boolean);
                    const label = field.etiqueta || `Campo ${index + 1}`;
                    return (
                      <Box key={index}>
                        {field.tipo === 'TEXTO_CORTO' && (
                          <TextField label={label} required={field.requerido} fullWidth size="small" disabled />
                        )}
                        {field.tipo === 'TEXTO_LARGO' && (
                          <TextField label={label} required={field.requerido} fullWidth multiline minRows={3} size="small" disabled />
                        )}
                        {field.tipo === 'FECHA' && (
                          <TextField
                            label={label}
                            required={field.requerido}
                            type="date"
                            size="small"
                            disabled
                            slotProps={{ inputLabel: { shrink: true } }}
                          />
                        )}
                        {field.tipo === 'RADIO' && (
                          <FormControl disabled>
                            <Typography variant="body2">
                              {label}
                              {field.requerido && ' *'}
                            </Typography>
                            <RadioGroup>
                              {opciones.map((o) => (
                                <FormControlLabel key={o} value={o} control={<Radio size="small" />} label={o} />
                              ))}
                            </RadioGroup>
                          </FormControl>
                        )}
                        {field.tipo === 'CHECKBOX' && (
                          <FormControl disabled>
                            <Typography variant="body2">
                              {label}
                              {field.requerido && ' *'}
                            </Typography>
                            <FormGroup>
                              {opciones.map((o) => (
                                <FormControlLabel key={o} control={<Checkbox size="small" />} label={o} />
                              ))}
                            </FormGroup>
                          </FormControl>
                        )}
                        {field.tipo === 'DESPLEGABLE' && (
                          <FormControl fullWidth size="small" disabled>
                            <InputLabel id={`preview-${index}`}>{label}</InputLabel>
                            <Select labelId={`preview-${index}`} label={label} value="">
                              {opciones.map((o) => (
                                <MenuItem key={o} value={o}>
                                  {o}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                        {field.tipo === 'ARCHIVO' && (
                          <Stack spacing={0.5}>
                            <Typography variant="body2">
                              {label}
                              {field.requerido && ' *'}
                            </Typography>
                            <Button variant="outlined" size="small" disabled sx={{ alignSelf: 'flex-start' }}>
                              Elegir archivo
                            </Button>
                          </Stack>
                        )}
                        {field.tipo === 'FOTO' && (
                          <Stack spacing={0.5}>
                            <Typography variant="body2">
                              {label}
                              {field.requerido && ' *'}
                            </Typography>
                            <Button
                              variant="outlined"
                              size="small"
                              disabled
                              startIcon={<PhotoCameraIcon fontSize="small" />}
                              sx={{ alignSelf: 'flex-start' }}
                            >
                              Tomar foto
                            </Button>
                          </Stack>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}
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
