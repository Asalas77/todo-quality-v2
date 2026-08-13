import { useState } from 'react';
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
import { AxiosError } from 'axios';
import { MainLayout } from '../components/MainLayout';
import { CreateScheduleDialog } from '../components/CreateScheduleDialog';
import { agendaApi, SCHEDULE_ESTADO_LABEL } from '../api/agenda';
import type { ScheduleStatus } from '../api/agenda';
import { useAuth } from '../context/AuthContext';

const ESTADO_COLOR: Record<ScheduleStatus, 'default' | 'success' | 'error'> = {
  PENDIENTE: 'default',
  COMPLETADA: 'success',
  CANCELADA: 'error',
};

export function AgendaPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('agenda.gestionar');
  const canStart = hasPermission('inspecciones.completar');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [estadoFilter, setEstadoFilter] = useState<ScheduleStatus | ''>('PENDIENTE');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: schedule = [], isLoading } = useQuery({
    queryKey: ['agenda', estadoFilter],
    queryFn: () => agendaApi.list(estadoFilter ? { estado: estadoFilter } : {}),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['agenda'] });

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

  return (
    <MainLayout>
      <Card sx={{ p: 3 }}>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
        >
          <Typography variant="h5">Agenda</Typography>
          {canManage && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
              Programar inspección
            </Button>
          )}
        </Stack>

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

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Plantilla</TableCell>
              <TableCell>Centro</TableCell>
              <TableCell>Asignado a</TableCell>
              <TableCell>Título</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!isLoading && schedule.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No hay programaciones para mostrar.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {schedule.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.fecha}</TableCell>
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
                      {canStart && (
                        <Button
                          size="small"
                          startIcon={<PlayArrowIcon />}
                          onClick={() => startMutation.mutate(item.id)}
                          disabled={startMutation.isPending}
                        >
                          Iniciar
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <CreateScheduleDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={() => {
          setDialogOpen(false);
          invalidate();
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
