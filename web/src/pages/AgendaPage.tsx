import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CancelIcon from '@mui/icons-material/Cancel';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DescriptionIcon from '@mui/icons-material/Description';
import { AxiosError } from 'axios';
import { MainLayout } from '../components/MainLayout';
import { CreateScheduleDialog } from '../components/CreateScheduleDialog';
import { StartInspectionDialog } from '../components/StartInspectionDialog';
import { AgendaCalendar } from '../components/AgendaCalendar';
import { AgendaKanban } from '../components/AgendaKanban';
import { agendaApi, SCHEDULE_ESTADO_LABEL } from '../api/agenda';
import type { Schedule, ScheduleStatus } from '../api/agenda';
import { inspeccionesApi, ESTADO_LABEL } from '../api/inspecciones';
import type { InspectionStatus } from '../api/inspecciones';
import { useAuth } from '../context/AuthContext';

type ViewMode = 'calendario' | 'lista' | 'kanban';

const ESTADO_COLOR: Record<ScheduleStatus, 'default' | 'success' | 'error'> = {
  PENDIENTE: 'default',
  COMPLETADA: 'success',
  CANCELADA: 'error',
};

const INSPECCION_ESTADO_COLOR: Record<InspectionStatus, 'default' | 'success' | 'error'> = {
  BORRADOR: 'default',
  CONFORME: 'success',
  NO_CONFORME: 'error',
};

export function AgendaPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('agenda.gestionar');
  const canComplete =
    hasPermission('inspecciones.completar') || hasPermission('formularios.completar');
  const canStart = hasPermission('inspecciones.completar');
  const canCompleteForms = hasPermission('formularios.completar');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [view, setView] = useState<ViewMode>('calendario');
  const [estadoFilter, setEstadoFilter] = useState<ScheduleStatus | ''>('PENDIENTE');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calendario y Kanban necesitan el panorama completo (sin filtro), no solo lo pendiente.
  const { data: allSchedule = [] } = useQuery({
    queryKey: ['agenda', ''],
    queryFn: () => agendaApi.list({}),
  });

  const { data: filteredSchedule = [], isLoading: loadingSchedule } = useQuery({
    queryKey: ['agenda', estadoFilter],
    queryFn: () => agendaApi.list(estadoFilter ? { estado: estadoFilter } : {}),
    enabled: view === 'lista',
  });

  const { data: inspections = [], isLoading: loadingInspections } = useQuery({
    queryKey: ['inspecciones', ''],
    queryFn: () => inspeccionesApi.list({}),
  });

  const pendingSchedule = useMemo(
    () => allSchedule.filter((item) => item.estado === 'PENDIENTE'),
    [allSchedule],
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['agenda'] });
    queryClient.invalidateQueries({ queryKey: ['inspecciones'] });
  };

  const cancelMutation = useMutation({
    mutationFn: (id: string) => agendaApi.cancel(id),
    onSuccess: invalidate,
    onError: (error) => setErrorMessage(describeError(error)),
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => agendaApi.start(id),
    onSuccess: (inspection) => {
      invalidate();
      navigate(`/inspecciones/${inspection.id}`);
    },
    onError: (error) => setErrorMessage(describeError(error)),
  });

  const handleStartSchedule = (item: Schedule) => startMutation.mutate(item.id);

  return (
    <MainLayout>
      <Card sx={{ p: 3 }}>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}
        >
          <Typography variant="h5">Agenda</Typography>
          <Stack direction="row" spacing={1}>
            {canComplete && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setStartDialogOpen(true)}
              >
                Nueva inspección o formulario
              </Button>
            )}
            {canManage && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setScheduleDialogOpen(true)}>
                Programar
              </Button>
            )}
          </Stack>
        </Stack>

        <Tabs value={view} onChange={(_, v) => setView(v)} sx={{ mb: 2 }}>
          <Tab value="calendario" label="Calendario" />
          <Tab value="lista" label="Lista" />
          <Tab value="kanban" label="Kanban" />
        </Tabs>

        {view === 'calendario' && (
          <AgendaCalendar
            pendingSchedule={pendingSchedule}
            inspections={inspections}
            onStartSchedule={handleStartSchedule}
          />
        )}

        {view === 'kanban' && (
          <AgendaKanban
            pendingSchedule={pendingSchedule}
            inspections={inspections}
            onStartSchedule={handleStartSchedule}
          />
        )}

        {view === 'lista' && (
          <>
            <FormControl size="small" sx={{ minWidth: 200, mb: 2 }}>
              <InputLabel id="agenda-estado-label">Estado</InputLabel>
              <Select
                labelId="agenda-estado-label"
                label="Estado"
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value as ScheduleStatus | '')}
              >
                <MenuItem value="">Todos</MenuItem>
                {(Object.keys(SCHEDULE_ESTADO_LABEL) as ScheduleStatus[]).map((estado) => (
                  <MenuItem key={estado} value={estado}>
                    {SCHEDULE_ESTADO_LABEL[estado]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Table size="small" sx={{ mb: 4 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Plantilla</TableCell>
                  <TableCell>Centro</TableCell>
                  <TableCell>Asignado a</TableCell>
                  <TableCell>Título</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!loadingSchedule && filteredSchedule.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        No hay programaciones para mostrar.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {filteredSchedule.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.fecha}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        icon={item.tipo === 'CHECKLIST' ? <AssignmentIcon /> : <DescriptionIcon />}
                        label={item.tipo === 'CHECKLIST' ? 'Checklist' : 'Formulario'}
                        color={item.tipo === 'CHECKLIST' ? 'primary' : 'secondary'}
                      />
                    </TableCell>
                    <TableCell>{item.templateNombre}</TableCell>
                    <TableCell>{item.centroNombre}</TableCell>
                    <TableCell>{item.asignadoNombre}</TableCell>
                    <TableCell>{item.asunto ?? '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={SCHEDULE_ESTADO_LABEL[item.estado]}
                        color={ESTADO_COLOR[item.estado]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {item.estado === 'PENDIENTE' && (
                        <>
                          {item.tipo === 'CHECKLIST' && canStart && (
                            <Button
                              size="small"
                              startIcon={<PlayArrowIcon />}
                              onClick={() => startMutation.mutate(item.id)}
                              disabled={startMutation.isPending}
                            >
                              Iniciar
                            </Button>
                          )}
                          {item.tipo === 'FORMULARIO' && canCompleteForms && (
                            <Button
                              size="small"
                              startIcon={<PlayArrowIcon />}
                              onClick={() =>
                                navigate(
                                  `/formularios/${item.formId}/completar?scheduleId=${item.id}`,
                                )
                              }
                            >
                              Completar
                            </Button>
                          )}
                          {canManage && (
                            <Button
                              size="small"
                              color="error"
                              startIcon={<CancelIcon />}
                              onClick={() => cancelMutation.mutate(item.id)}
                              disabled={cancelMutation.isPending}
                            >
                              Cancelar
                            </Button>
                          )}
                        </>
                      )}
                      {item.estado === 'COMPLETADA' && item.inspectionId && (
                        <Button size="small" onClick={() => navigate(`/inspecciones/${item.inspectionId}`)}>
                          Ver inspección
                        </Button>
                      )}
                      {item.estado === 'COMPLETADA' && item.formRespuestaId && (
                        <Button
                          size="small"
                          onClick={() => navigate(`/formularios/${item.formId}/respuestas`)}
                        >
                          Ver respuesta
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Inspecciones completadas
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Plantilla</TableCell>
                  <TableCell>Centro</TableCell>
                  <TableCell>Inspector</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!loadingInspections && inspections.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        No hay inspecciones para mostrar.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {inspections.map((inspection) => (
                  <TableRow
                    key={inspection.id}
                    hover
                    onClick={() => navigate(`/inspecciones/${inspection.id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{inspection.fecha}</TableCell>
                    <TableCell>{inspection.templateNombre}</TableCell>
                    <TableCell>{inspection.centroNombre}</TableCell>
                    <TableCell>{inspection.inspectorNombre}</TableCell>
                    <TableCell>
                      <Chip
                        label={ESTADO_LABEL[inspection.estado]}
                        color={INSPECCION_ESTADO_COLOR[inspection.estado]}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Card>

      <CreateScheduleDialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        onCreated={() => {
          setScheduleDialogOpen(false);
          invalidate();
        }}
      />

      <StartInspectionDialog
        open={startDialogOpen}
        onClose={() => setStartDialogOpen(false)}
        onStarted={(id) => {
          setStartDialogOpen(false);
          navigate(`/inspecciones/${id}`);
        }}
      />

      <Snackbar open={!!errorMessage} autoHideDuration={5000} onClose={() => setErrorMessage(null)}>
        <Alert severity="error" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
}

function describeError(error: unknown): string {
  const response = (error as AxiosError<{ message?: string | string[] }>).response;
  const message = response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message ?? 'Ocurrió un error inesperado.';
}
