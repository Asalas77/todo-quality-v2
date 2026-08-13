import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
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
import { MainLayout } from '../components/MainLayout';
import { StartInspectionDialog } from '../components/StartInspectionDialog';
import { InspeccionesCalendar } from '../components/InspeccionesCalendar';
import { InspeccionesKanban } from '../components/InspeccionesKanban';
import { inspeccionesApi, ESTADO_LABEL } from '../api/inspecciones';
import type { InspectionStatus } from '../api/inspecciones';
import { useAuth } from '../context/AuthContext';

type ViewMode = 'lista' | 'calendario' | 'kanban';

const ESTADO_COLOR: Record<InspectionStatus, 'default' | 'success' | 'error'> = {
  BORRADOR: 'default',
  CONFORME: 'success',
  NO_CONFORME: 'error',
};

export function InspeccionesPage() {
  const { hasPermission } = useAuth();
  const canComplete = hasPermission('inspecciones.completar');
  const navigate = useNavigate();

  const [estadoFilter, setEstadoFilter] = useState<InspectionStatus | ''>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [view, setView] = useState<ViewMode>('lista');

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ['inspecciones', estadoFilter],
    queryFn: () => inspeccionesApi.list(estadoFilter ? { estado: estadoFilter } : {}),
  });

  // Calendario y Kanban muestran todo el panorama sin el filtro de estado de la lista —
  // se piden sin filtro para no tener que sincronizar dos estados de filtro distintos.
  const { data: allInspections = [] } = useQuery({
    queryKey: ['inspecciones', ''],
    queryFn: () => inspeccionesApi.list({}),
    enabled: view !== 'lista',
  });

  return (
    <MainLayout>
      <Card sx={{ p: 3 }}>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
        >
          <Typography variant="h5">Inspecciones</Typography>
          {canComplete && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
            >
              Nueva inspección
            </Button>
          )}
        </Stack>

        <Tabs value={view} onChange={(_, v) => setView(v)} sx={{ mb: 2 }}>
          <Tab value="lista" label="Lista" />
          <Tab value="calendario" label="Calendario" />
          <Tab value="kanban" label="Kanban" />
        </Tabs>

        {view === 'lista' && (
          <FormControl size="small" sx={{ minWidth: 200, mb: 2 }}>
            <InputLabel id="estado-filter-label">Estado</InputLabel>
            <Select
              labelId="estado-filter-label"
              label="Estado"
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value as InspectionStatus | '')}
            >
              <MenuItem value="">Todos</MenuItem>
              {(Object.keys(ESTADO_LABEL) as InspectionStatus[]).map((estado) => (
                <MenuItem key={estado} value={estado}>
                  {ESTADO_LABEL[estado]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {view === 'calendario' && <InspeccionesCalendar inspections={allInspections} />}
        {view === 'kanban' && <InspeccionesKanban inspections={allInspections} />}

        {view === 'lista' && (
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
            {!isLoading && inspections.length === 0 && (
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
                    color={ESTADO_COLOR[inspection.estado]}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
      </Card>

      <StartInspectionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onStarted={(id) => {
          setDialogOpen(false);
          navigate(`/inspecciones/${id}`);
        }}
      />
    </MainLayout>
  );
}
