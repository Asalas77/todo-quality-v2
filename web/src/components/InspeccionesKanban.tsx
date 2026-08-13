import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { ESTADO_LABEL } from '../api/inspecciones';
import type { InspectionStatus, InspectionSummary } from '../api/inspecciones';

const COLUMN_ORDER: InspectionStatus[] = ['BORRADOR', 'NO_CONFORME', 'CONFORME'];

const COLUMN_COLOR: Record<InspectionStatus, string> = {
  BORRADOR: '#757575',
  NO_CONFORME: '#c62828',
  CONFORME: '#2e7d32',
};

interface InspeccionesKanbanProps {
  inspections: InspectionSummary[];
}

export function InspeccionesKanban({ inspections }: InspeccionesKanbanProps) {
  const navigate = useNavigate();

  const byEstado = useMemo(() => {
    const map = new Map<InspectionStatus, InspectionSummary[]>();
    for (const estado of COLUMN_ORDER) map.set(estado, []);
    for (const inspection of inspections) {
      map.get(inspection.estado)?.push(inspection);
    }
    return map;
  }, [inspections]);

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, alignItems: 'flex-start' }}>
      {COLUMN_ORDER.map((estado) => {
        const items = byEstado.get(estado) ?? [];
        return (
          <Box key={estado}>
            <Stack
              direction="row"
              sx={{
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1.5,
                pb: 1,
                borderBottom: '3px solid',
                borderColor: COLUMN_COLOR[estado],
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {ESTADO_LABEL[estado]}
              </Typography>
              <Chip label={items.length} size="small" />
            </Stack>

            <Stack spacing={1.5}>
              {items.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  Sin inspecciones en este estado.
                </Typography>
              )}
              {items.map((inspection) => (
                <Card
                  key={inspection.id}
                  variant="outlined"
                  sx={{ cursor: 'pointer', borderLeft: '4px solid', borderLeftColor: COLUMN_COLOR[estado] }}
                  onClick={() => navigate(`/inspecciones/${inspection.id}`)}
                >
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {inspection.templateNombre}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {inspection.centroNombre} · {inspection.fecha}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {inspection.inspectorNombre}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        );
      })}
    </Box>
  );
}
