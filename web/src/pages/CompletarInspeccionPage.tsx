import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AxiosError } from 'axios';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import { MainLayout } from '../components/MainLayout';
import { EvidenciaFoto } from '../components/EvidenciaFoto';
import { InspeccionPrintView } from '../components/InspeccionPrintView';
import { exportInspeccionExcel } from '../utils/exportInspeccionExcel';
import {
  inspeccionesApi,
  ESTADO_LABEL,
  RESPUESTA_LABEL,
} from '../api/inspecciones';
import type { AnswerInput, AnswerStatus, InspectionStatus } from '../api/inspecciones';
import { useAuth } from '../context/AuthContext';

interface LocalAnswer {
  estado: AnswerStatus | '';
  observacion: string;
  planAccion: string;
  fechaCompromiso: string;
  fechaControl: string;
  responsable: string;
}

const EMPTY_ANSWER: LocalAnswer = {
  estado: '',
  observacion: '',
  planAccion: '',
  fechaCompromiso: '',
  fechaControl: '',
  responsable: '',
};

const ESTADO_COLOR: Record<InspectionStatus, 'default' | 'success' | 'error'> = {
  BORRADOR: 'default',
  CONFORME: 'success',
  NO_CONFORME: 'error',
};

export function CompletarInspeccionPage() {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('inspecciones.completar');
  const queryClient = useQueryClient();

  const { data: inspection, isLoading } = useQuery({
    queryKey: ['inspeccion', id],
    queryFn: () => inspeccionesApi.get(id!),
    enabled: !!id,
  });

  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!inspection) return;
    const initial: Record<string, LocalAnswer> = {};
    for (const answer of inspection.answers) {
      initial[answer.templateItemId] = {
        estado: answer.estado ?? '',
        observacion: answer.observacion ?? '',
        planAccion: answer.planAccion ?? '',
        fechaCompromiso: answer.fechaCompromiso ?? '',
        fechaControl: answer.fechaControl ?? '',
        responsable: answer.responsable ?? '',
      };
    }
    setAnswers(initial);
  }, [inspection]);

  const saveMutation = useMutation({
    mutationFn: (payload: AnswerInput[]) => inspeccionesApi.saveAnswers(id!, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['inspeccion', id], updated);
      queryClient.invalidateQueries({ queryKey: ['inspecciones'] });
      setSuccessMessage('Avance guardado.');
    },
  });

  const updateAnswer = (templateItemId: string, patch: Partial<LocalAnswer>) => {
    setAnswers((prev) => ({
      ...prev,
      [templateItemId]: { ...(prev[templateItemId] ?? EMPTY_ANSWER), ...patch },
    }));
  };

  const answeredCount = useMemo(
    () => Object.values(answers).filter((a) => a.estado !== '').length,
    [answers],
  );

  const handleSave = () => {
    setValidationErrors([]);

    const payload: AnswerInput[] = [];
    const errors: string[] = [];

    inspection?.answers.forEach((item, index) => {
      const local = answers[item.templateItemId];
      if (!local || local.estado === '') return;

      if (local.estado === 'NO_CUMPLE') {
        const missing: string[] = [];
        if (!local.planAccion) missing.push('plan de acción');
        if (!local.fechaCompromiso) missing.push('fecha de compromiso');
        if (!local.fechaControl) missing.push('fecha de control');
        if (!local.responsable) missing.push('responsable');
        if (missing.length > 0) {
          errors.push(`Ítem ${index + 1} (${item.itemDescripcion}): falta ${missing.join(', ')}`);
          return;
        }
      }

      payload.push({
        templateItemId: item.templateItemId,
        estado: local.estado,
        observacion: local.observacion || undefined,
        planAccion: local.estado === 'NO_CUMPLE' ? local.planAccion : undefined,
        fechaCompromiso: local.estado === 'NO_CUMPLE' ? local.fechaCompromiso : undefined,
        fechaControl: local.estado === 'NO_CUMPLE' ? local.fechaControl : undefined,
        responsable: local.estado === 'NO_CUMPLE' ? local.responsable : undefined,
      });
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (payload.length === 0) return;

    saveMutation.mutate(payload, {
      onError: (error) => {
        const response = (error as AxiosError<{ message?: string | string[] }>).response;
        const message = response?.data?.message;
        setValidationErrors(Array.isArray(message) ? message : [message ?? 'Error al guardar.']);
      },
    });
  };

  if (isLoading || !inspection) {
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
      <Card sx={{ p: 3, mb: 2 }} className="no-print">
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5">{inspection.templateNombre}</Typography>
            <Typography color="text.secondary">
              {inspection.centroNombre} · {inspection.fecha} · {inspection.inspectorNombre}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Chip
              label={`${ESTADO_LABEL[inspection.estado]} (${answeredCount}/${inspection.answers.length})`}
              color={ESTADO_COLOR[inspection.estado]}
            />
            <Button
              size="small"
              startIcon={<PrintIcon />}
              onClick={() => window.print()}
            >
              Imprimir
            </Button>
            <Button
              size="small"
              startIcon={<DownloadIcon />}
              onClick={() => exportInspeccionExcel(inspection)}
            >
              Excel
            </Button>
          </Stack>
        </Stack>
      </Card>

      <InspeccionPrintView inspection={inspection} />

      {validationErrors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }} className="no-print" onClose={() => setValidationErrors([])}>
          {validationErrors.map((message) => (
            <div key={message}>{message}</div>
          ))}
        </Alert>
      )}

      <Stack spacing={2} className="no-print">
        {inspection.answers.map((item, index) => {
          const local = answers[item.templateItemId] ?? EMPTY_ANSWER;
          return (
            <Card key={item.templateItemId}>
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                    {index + 1}. {item.itemDescripcion}
                  </Typography>
                  <Chip
                    label={item.itemCriticidad === 'CRITICO' ? 'Crítico' : 'Básico'}
                    color={item.itemCriticidad === 'CRITICO' ? 'warning' : 'default'}
                    size="small"
                  />
                </Stack>

                <FormControl fullWidth size="small" disabled={!canEdit} sx={{ mb: 2 }}>
                  <InputLabel id={`estado-${item.templateItemId}-label`}>Respuesta</InputLabel>
                  <Select
                    labelId={`estado-${item.templateItemId}-label`}
                    label="Respuesta"
                    value={local.estado}
                    onChange={(e) =>
                      updateAnswer(item.templateItemId, {
                        estado: e.target.value as AnswerStatus,
                      })
                    }
                  >
                    {(Object.keys(RESPUESTA_LABEL) as AnswerStatus[]).map((estado) => (
                      <MenuItem key={estado} value={estado}>
                        {RESPUESTA_LABEL[estado]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {local.estado === 'NO_CUMPLE' && (
                  <Stack spacing={1.5} sx={{ mb: 2 }}>
                    <Divider />
                    <TextField
                      label="Plan de acción"
                      size="small"
                      fullWidth
                      disabled={!canEdit}
                      value={local.planAccion}
                      onChange={(e) =>
                        updateAnswer(item.templateItemId, { planAccion: e.target.value })
                      }
                    />
                    <Stack direction="row" spacing={2}>
                      <TextField
                        label="Fecha de compromiso"
                        type="date"
                        size="small"
                        fullWidth
                        disabled={!canEdit}
                        slotProps={{ inputLabel: { shrink: true } }}
                        value={local.fechaCompromiso}
                        onChange={(e) =>
                          updateAnswer(item.templateItemId, { fechaCompromiso: e.target.value })
                        }
                      />
                      <TextField
                        label="Fecha de control"
                        type="date"
                        size="small"
                        fullWidth
                        disabled={!canEdit}
                        slotProps={{ inputLabel: { shrink: true } }}
                        value={local.fechaControl}
                        onChange={(e) =>
                          updateAnswer(item.templateItemId, { fechaControl: e.target.value })
                        }
                      />
                    </Stack>
                    <TextField
                      label="Responsable"
                      size="small"
                      fullWidth
                      disabled={!canEdit}
                      value={local.responsable}
                      onChange={(e) =>
                        updateAnswer(item.templateItemId, { responsable: e.target.value })
                      }
                    />
                    <Typography variant="caption" color="text.secondary">
                      Evidencia fotográfica (opcional)
                    </Typography>
                    <EvidenciaFoto
                      inspectionId={id!}
                      templateItemId={item.templateItemId}
                      hasEvidencia={!!item.evidenciaUrl}
                      canEdit={canEdit}
                    />
                  </Stack>
                )}

                <TextField
                  label="Observación (opcional)"
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  disabled={!canEdit}
                  value={local.observacion}
                  onChange={(e) =>
                    updateAnswer(item.templateItemId, { observacion: e.target.value })
                  }
                />
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {canEdit && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }} className="no-print">
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Guardando…' : 'Guardar avance'}
          </Button>
        </Box>
      )}

      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
      >
        <Alert severity="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
}
