import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PercentIcon from '@mui/icons-material/Percent';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { MainLayout } from '../components/MainLayout';
import { StatTile } from '../components/StatTile';
import { TrendChart } from '../components/TrendChart';
import { CentroConformidadCard } from '../components/CentroConformidadCard';
import { reportesApi } from '../api/reportes';
import { centrosApi } from '../api/centros';
import { inspeccionesApi } from '../api/inspecciones';
import { useAuth } from '../context/AuthContext';

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function ReportesPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canResolve = hasPermission('inspecciones.ver_todas');

  const [desde, setDesde] = useState(isoDaysAgo(30));
  const [hasta, setHasta] = useState(isoDaysAgo(0));
  const [centroId, setCentroId] = useState('');
  const [incluirResueltos, setIncluirResueltos] = useState(false);

  const filter = useMemo(
    () => ({ desde, hasta, centroId: centroId || undefined }),
    [desde, hasta, centroId],
  );

  const { data: centros = [] } = useQuery({
    queryKey: ['centros', false],
    queryFn: () => centrosApi.list(false),
  });

  const summaryQuery = useQuery({
    queryKey: ['reportes-resumen', filter],
    queryFn: () => reportesApi.getSummary(filter),
  });

  const trendQuery = useQuery({
    queryKey: ['reportes-tendencia', filter],
    queryFn: () => reportesApi.getTrend(filter),
  });

  const centrosQuery = useQuery({
    queryKey: ['reportes-centros', filter],
    queryFn: () => reportesApi.getConformidadPorCentro(filter),
  });

  const findingsQuery = useQuery({
    queryKey: ['reportes-hallazgos', centroId, incluirResueltos],
    queryFn: () => reportesApi.getHallazgosAbiertos(centroId || undefined, incluirResueltos),
  });

  const resolverMutation = useMutation({
    mutationFn: ({ inspectionId, templateItemId, resuelto }: { inspectionId: string; templateItemId: string; resuelto: boolean }) =>
      inspeccionesApi.resolverHallazgo(inspectionId, templateItemId, resuelto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportes-hallazgos'] });
      queryClient.invalidateQueries({ queryKey: ['reportes-resumen'] });
    },
  });

  const formulariosQuery = useQuery({
    queryKey: ['reportes-formularios', filter],
    queryFn: () => reportesApi.getFormulariosActividad(filter),
  });

  const summary = summaryQuery.data;

  return (
    <MainLayout>
      <Stack spacing={3}>
        <Card sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="h5" sx={{ flexGrow: 1 }}>
              Reportes
            </Typography>
            <TextField
              label="Desde"
              type="date"
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
            <TextField
              label="Hasta"
              type="date"
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="reportes-centro-label">Centro</InputLabel>
              <Select
                labelId="reportes-centro-label"
                label="Centro"
                value={centroId}
                onChange={(e) => setCentroId(e.target.value)}
              >
                <MenuItem value="">Todos los centros</MenuItem>
                {centros.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Card>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatTile
              label="Inspecciones completadas"
              value={summaryQuery.isLoading ? '—' : (summary?.inspeccionesCompletadas ?? 0)}
              icon={<FactCheckIcon color="action" />}
              hint={`${desde} a ${hasta}`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatTile
              label="% Conformidad"
              value={summaryQuery.isLoading ? '—' : `${summary?.porcentajeConformidad ?? 0}%`}
              icon={<PercentIcon color="action" />}
              color={
                (summary?.porcentajeConformidad ?? 100) >= 80
                  ? 'success'
                  : (summary?.porcentajeConformidad ?? 100) >= 50
                    ? 'warning'
                    : 'error'
              }
              hint={`${summary?.inspeccionesConformes ?? 0} conformes / ${summary?.inspeccionesNoConformes ?? 0} no conformes`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatTile
              label="Hallazgos abiertos"
              value={summaryQuery.isLoading ? '—' : (summary?.hallazgosAbiertos ?? 0)}
              icon={<WarningAmberIcon color="action" />}
              color={(summary?.hallazgosAbiertos ?? 0) > 0 ? 'warning' : 'default'}
              hint="No cumple sin resolver"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatTile
              label="Hallazgos vencidos"
              value={summaryQuery.isLoading ? '—' : (summary?.hallazgosVencidos ?? 0)}
              icon={<ErrorOutlineIcon color="action" />}
              color={(summary?.hallazgosVencidos ?? 0) > 0 ? 'error' : 'default'}
              hint="Fecha de control ya pasada"
            />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 7 }}>
            <TrendChart data={trendQuery.data ?? []} isLoading={trendQuery.isLoading} />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <CentroConformidadCard data={centrosQuery.data ?? []} isLoading={centrosQuery.isLoading} />
          </Grid>
        </Grid>

        <Card>
          <CardContent>
            <Stack
              direction="row"
              sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 1 }}
            >
              <Typography variant="subtitle1">Formularios completados</Typography>
              <Typography variant="h5" color="secondary.main">
                {formulariosQuery.isLoading
                  ? '—'
                  : (formulariosQuery.data?.totalRespuestas ?? 0)}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Los formularios registran datos libres, sin cumple/no cumple, así que no
              entran en la conformidad.
            </Typography>
            {formulariosQuery.isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (formulariosQuery.data?.porFormulario ?? []).length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No se completaron formularios en este período.
              </Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ mt: 1.5 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Formulario</TableCell>
                    <TableCell align="right">Respuestas</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(formulariosQuery.data?.porFormulario ?? []).map((f) => (
                    <TableRow key={f.formId} hover>
                      <TableCell>{f.formNombre}</TableCell>
                      <TableCell align="right">{f.respuestas}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </Box>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack
              direction="row"
              sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}
            >
              <Typography variant="subtitle1">Hallazgos</Typography>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={incluirResueltos}
                    onChange={(e) => setIncluirResueltos(e.target.checked)}
                  />
                }
                label="Ver también resueltos"
              />
            </Stack>
            {findingsQuery.isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Centro</TableCell>
                    <TableCell>Plantilla</TableCell>
                    <TableCell>Ítem</TableCell>
                    <TableCell>Responsable</TableCell>
                    <TableCell>Fecha de control</TableCell>
                    <TableCell>Estado</TableCell>
                    {canResolve && <TableCell align="right">Acciones</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(findingsQuery.data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canResolve ? 7 : 6}>
                        <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                          {incluirResueltos ? 'No hay hallazgos.' : 'No hay hallazgos abiertos.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {(findingsQuery.data ?? []).map((finding) => {
                    const key = `${finding.inspectionId}-${finding.templateItemId}`;
                    const pending =
                      resolverMutation.isPending &&
                      resolverMutation.variables?.inspectionId === finding.inspectionId &&
                      resolverMutation.variables?.templateItemId === finding.templateItemId;
                    return (
                      <TableRow key={key} hover>
                        <TableCell>{finding.centroNombre}</TableCell>
                        <TableCell>{finding.templateNombre}</TableCell>
                        <TableCell>{finding.itemDescripcion}</TableCell>
                        <TableCell>{finding.responsable ?? '—'}</TableCell>
                        <TableCell>{finding.fechaControl ?? '—'}</TableCell>
                        <TableCell>
                          {finding.resuelto ? (
                            <Stack spacing={0.25}>
                              <Chip
                                icon={<CheckCircleIcon />}
                                label="Resuelto"
                                color="success"
                                size="small"
                                sx={{ width: 'fit-content' }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {finding.resueltoPorNombre} ·{' '}
                                {finding.resueltoAt && new Date(finding.resueltoAt).toLocaleString()}
                              </Typography>
                            </Stack>
                          ) : finding.vencido ? (
                            <Chip label="Vencido" color="error" size="small" />
                          ) : (
                            <Chip label="En plazo" color="default" size="small" />
                          )}
                        </TableCell>
                        {canResolve && (
                          <TableCell align="right">
                            <Button
                              size="small"
                              disabled={pending}
                              onClick={() =>
                                resolverMutation.mutate({
                                  inspectionId: finding.inspectionId,
                                  templateItemId: finding.templateItemId,
                                  resuelto: !finding.resuelto,
                                })
                              }
                            >
                              {finding.resuelto ? 'Reabrir' : 'Marcar resuelto'}
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </Box>
            )}
          </CardContent>
        </Card>
      </Stack>
    </MainLayout>
  );
}
