import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { MainLayout } from '../components/MainLayout';
import { formulariosApi } from '../api/formularios';
import { http } from '../api/http';
import type { FormResponseValueInput } from '../api/formularios';

type LocalValues = Record<string, string | string[]>;

export function CompletarFormularioPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Presente cuando se llega desde la agenda: al enviar, cierra esa programación.
  const [searchParams] = useSearchParams();
  const scheduleId = searchParams.get('scheduleId') ?? undefined;

  const { data: form, isLoading } = useQuery({
    queryKey: ['formulario', id],
    queryFn: () => formulariosApi.get(id!),
    enabled: !!id,
  });

  // Si el usuario ya había guardado avance en este formulario, se retoma automáticamente
  // al entrar — es justo lo que "guardar para después" promete.
  const { data: draft, isLoading: loadingDraft } = useQuery({
    queryKey: ['formulario-borrador', id],
    queryFn: () => formulariosApi.getDraft(id!),
    enabled: !!id,
  });

  const [values, setValues] = useState<LocalValues>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  // Archivos ya subidos en un borrador previo — no se vuelven a pedir salvo que el
  // usuario elija reemplazarlos.
  const [existingArchivos, setExistingArchivos] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  useEffect(() => {
    if (!draft || draftLoaded) return;
    const initial: LocalValues = {};
    const archivos: Record<string, string> = {};
    for (const valor of draft.valores) {
      if (valor.valorTexto) initial[valor.campoId] = valor.valorTexto;
      else if (valor.valorFecha) initial[valor.campoId] = valor.valorFecha;
      else if (valor.valorOpciones) {
        initial[valor.campoId] =
          valor.campoTipo === 'CHECKBOX' ? valor.valorOpciones : (valor.valorOpciones[0] ?? '');
      } else if (valor.archivoUrl) archivos[valor.campoId] = valor.archivoUrl;
    }
    setValues(initial);
    setExistingArchivos(archivos);
    setDraftLoaded(true);
  }, [draft, draftLoaded]);

  const buildValores = async (): Promise<FormResponseValueInput[]> => {
    const uploaded = await Promise.all(
      Object.entries(files).map(async ([campoId, file]) => [
        campoId,
        await formulariosApi.uploadArchivo(file),
      ] as const),
    );
    const urlByCampo = Object.fromEntries(uploaded);

    return (form?.fields ?? []).map((field) => {
      const value = values[field.id];
      if (field.tipo === 'FECHA') return { campoId: field.id, valorFecha: (value as string) || undefined };
      if (field.tipo === 'RADIO' || field.tipo === 'DESPLEGABLE') {
        return { campoId: field.id, valorOpciones: value ? [value as string] : undefined };
      }
      if (field.tipo === 'CHECKBOX') {
        return { campoId: field.id, valorOpciones: (value as string[]) ?? undefined };
      }
      if (field.tipo === 'ARCHIVO' || field.tipo === 'FOTO') {
        return { campoId: field.id, archivoUrl: urlByCampo[field.id] ?? existingArchivos[field.id] };
      }
      return { campoId: field.id, valorTexto: (value as string) || undefined };
    });
  };

  const draftMutation = useMutation({
    mutationFn: async () => {
      const valores = await buildValores();
      return formulariosApi.saveDraft(id!, { valores });
    },
    onSuccess: () => setErrorMessage(null),
    onError: (error) => setErrorMessage(describeError(error, 'No se pudo guardar el avance.')),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const valores = await buildValores();
      return formulariosApi.submit(id!, { valores, scheduleId });
    },
    onSuccess: () => navigate(scheduleId ? '/agenda' : `/formularios/${id}/respuestas`),
    onError: (error) => setErrorMessage(describeError(error, 'No se pudo enviar.')),
  });

  if (isLoading || loadingDraft || !form) {
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

      {draft && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Retomaste un borrador que habías guardado antes.
        </Alert>
      )}

      {draftMutation.isSuccess && !draftMutation.isPending && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => draftMutation.reset()}>
          Avance guardado. Puedes seguir después desde donde quedaste.
        </Alert>
      )}

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
                      {files[field.id]?.name ?? (existingArchivos[field.id] ? 'Archivo ya adjunto — cambiar' : 'Elegir archivo')}
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

                {field.tipo === 'FOTO' && (
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      {field.etiqueta}
                      {field.requerido && ' *'}
                    </Typography>
                    <FotoPreview
                      file={files[field.id]}
                      responseId={draft?.id}
                      hasExisting={!!existingArchivos[field.id]}
                      campoId={field.id}
                    />
                    <Button
                      variant="outlined"
                      component="label"
                      size="small"
                      startIcon={<PhotoCameraIcon fontSize="small" />}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      {files[field.id] || existingArchivos[field.id] ? 'Cambiar foto' : 'Tomar foto'}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
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

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
        <Button
          variant="outlined"
          disabled={draftMutation.isPending || submitMutation.isPending}
          onClick={() => draftMutation.mutate()}
        >
          {draftMutation.isPending ? 'Guardando…' : 'Guardar y continuar después'}
        </Button>
        <Button
          variant="contained"
          disabled={submitMutation.isPending || draftMutation.isPending}
          onClick={() => submitMutation.mutate()}
        >
          {submitMutation.isPending ? 'Enviando…' : 'Enviar'}
        </Button>
      </Box>
    </MainLayout>
  );
}

function FotoPreview({
  file,
  responseId,
  hasExisting,
  campoId,
}: {
  file: File | undefined;
  responseId: string | undefined;
  hasExisting: boolean;
  campoId: string;
}) {
  const [existingSrc, setExistingSrc] = useState<string | null>(null);

  useEffect(() => {
    if (file || !hasExisting || !responseId) return;
    let objectUrl: string | null = null;
    http
      .get(formulariosApi.archivoEndpoint(responseId, campoId), { responseType: 'blob' })
      .then(({ data }) => {
        objectUrl = URL.createObjectURL(data as Blob);
        setExistingSrc(objectUrl);
      })
      .catch(() => setExistingSrc(null));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, hasExisting, responseId, campoId]);

  const src = file ? URL.createObjectURL(file) : existingSrc;
  if (!src) return null;
  return (
    <Box
      component="img"
      src={src}
      alt="Vista previa"
      sx={{ maxWidth: 200, maxHeight: 200, borderRadius: 1, display: 'block' }}
    />
  );
}

function describeError(error: unknown, fallback: string): string {
  const response = (error as AxiosError<{ message?: string | string[] }>).response;
  const message = response?.data?.message;
  return Array.isArray(message) ? message.join(', ') : (message ?? fallback);
}
