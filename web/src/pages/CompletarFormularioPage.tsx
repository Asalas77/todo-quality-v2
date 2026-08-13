import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AxiosError } from 'axios';
import { MainLayout } from '../components/MainLayout';
import { formulariosApi } from '../api/formularios';
import type { FormResponseValueInput } from '../api/formularios';

type LocalValues = Record<string, string | string[]>;

export function CompletarFormularioPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: form, isLoading } = useQuery({
    queryKey: ['formulario', id],
    queryFn: () => formulariosApi.get(id!),
    enabled: !!id,
  });

  const [values, setValues] = useState<LocalValues>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const uploaded = await Promise.all(
        Object.entries(files).map(async ([campoId, file]) => [
          campoId,
          await formulariosApi.uploadArchivo(file),
        ] as const),
      );
      const urlByCampo = Object.fromEntries(uploaded);

      const valores: FormResponseValueInput[] = (form?.fields ?? []).map((field) => {
        const value = values[field.id];
        if (field.tipo === 'FECHA') return { campoId: field.id, valorFecha: (value as string) || undefined };
        if (field.tipo === 'RADIO' || field.tipo === 'DESPLEGABLE') {
          return { campoId: field.id, valorOpciones: value ? [value as string] : undefined };
        }
        if (field.tipo === 'CHECKBOX') {
          return { campoId: field.id, valorOpciones: (value as string[]) ?? undefined };
        }
        if (field.tipo === 'ARCHIVO') {
          return { campoId: field.id, archivoUrl: urlByCampo[field.id] };
        }
        return { campoId: field.id, valorTexto: (value as string) || undefined };
      });

      return formulariosApi.submit(id!, { valores });
    },
    onSuccess: () => navigate(`/formularios/${id}/respuestas`),
    onError: (error) => {
      const response = (error as AxiosError<{ message?: string | string[] }>).response;
      const message = response?.data?.message;
      setErrorMessage(Array.isArray(message) ? message.join(', ') : message ?? 'No se pudo enviar.');
    },
  });

  if (isLoading || !form) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Card sx={{ p: 3, mb: 2 }}>
        <Typography variant="h5">{form.nombre}</Typography>
        {form.descripcion && <Typography color="text.secondary">{form.descripcion}</Typography>}
      </Card>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Stack spacing={3}>
            {form.fields.map((field) => (
              <Box key={field.id}>
                {field.tipo === 'TEXTO_CORTO' && (
                  <TextField
                    label={field.etiqueta}
                    required={field.requerido}
                    fullWidth
                    size="small"
                    value={values[field.id] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  />
                )}

                {field.tipo === 'TEXTO_LARGO' && (
                  <TextField
                    label={field.etiqueta}
                    required={field.requerido}
                    fullWidth
                    multiline
                    minRows={3}
                    size="small"
                    value={values[field.id] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  />
                )}

                {field.tipo === 'FECHA' && (
                  <TextField
                    label={field.etiqueta}
                    required={field.requerido}
                    type="date"
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={values[field.id] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  />
                )}

                {field.tipo === 'RADIO' && (
                  <FormControl>
                    <Typography variant="body2">
                      {field.etiqueta}
                      {field.requerido && ' *'}
                    </Typography>
                    <RadioGroup
                      value={values[field.id] ?? ''}
                      onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                    >
                      {(field.opciones ?? []).map((option) => (
                        <FormControlLabel key={option} value={option} control={<Radio size="small" />} label={option} />
                      ))}
                    </RadioGroup>
                  </FormControl>
                )}

                {field.tipo === 'DESPLEGABLE' && (
                  <FormControl fullWidth size="small">
                    <InputLabel id={`campo-${field.id}-label`}>{field.etiqueta}</InputLabel>
                    <Select
                      labelId={`campo-${field.id}-label`}
                      label={field.etiqueta}
                      value={values[field.id] ?? ''}
                      onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                    >
                      {(field.opciones ?? []).map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {field.tipo === 'CHECKBOX' && (
                  <FormControl>
                    <Typography variant="body2">
                      {field.etiqueta}
                      {field.requerido && ' *'}
                    </Typography>
                    <FormGroup>
                      {(field.opciones ?? []).map((option) => {
                        const selected = (values[field.id] as string[] | undefined) ?? [];
                        return (
                          <FormControlLabel
                            key={option}
                            control={
                              <Checkbox
                                size="small"
                                checked={selected.includes(option)}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...selected, option]
                                    : selected.filter((o) => o !== option);
                                  setValues((prev) => ({ ...prev, [field.id]: next }));
                                }}
                              />
                            }
                            label={option}
                          />
                        );
                      })}
                    </FormGroup>
                  </FormControl>
                )}

                {field.tipo === 'ARCHIVO' && (
                  <Stack spacing={0.5}>
                    <Typography variant="body2">
                      {field.etiqueta}
                      {field.requerido && ' *'}
                    </Typography>
                    <Button variant="outlined" component="label" size="small" sx={{ alignSelf: 'flex-start' }}>
                      {files[field.id] ? files[field.id].name : 'Elegir archivo'}
                      <input
                        type="file"
                        hidden
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setFiles((prev) => ({ ...prev, [field.id]: file }));
                        }}
                      />
                    </Button>
                  </Stack>
                )}
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          disabled={submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
        >
          {submitMutation.isPending ? 'Enviando…' : 'Enviar'}
        </Button>
      </Box>
    </MainLayout>
  );
}
