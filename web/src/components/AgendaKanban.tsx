import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { ESTADO_LABEL } from '../api/inspecciones';
import type { InspectionStatus, InspectionSummary } from '../api/inspecciones';
import type { Schedule } from '../api/agenda';

type Column = 'PENDIENTE' | InspectionStatus;

const COLUMN_ORDER: Column[] = ['PENDIENTE', 'BORRADOR', 'NO_CONFORME', 'CONFORME'];

const COLUMN_LABEL: Record<Column, string> = {
  PENDIENTE: 'Pendiente',
  ...ESTADO_LABEL,
};

const COLUMN_COLOR: Record<Column, string> = {
  PENDIENTE: '#1565c0',
  BORRADOR: '#757575',
  NO_CONFORME: '#c62828',
  CONFORME: '#2e7d32',
};

interface AgendaKanbanProps {
  pendingSchedule: Schedule[];
  inspections: InspectionSummary[];
  onStartSchedule: (item: Schedule) => void;
}

export function AgendaKanban({ pendingSchedule, inspections, onStartSchedule }: AgendaKanbanProps) {
  const navigate = useNavigate();

  const byColumn = useMemo(() => {
    const map = new Map<Column, { key: string; title: string; subtitle: string; onClick: () => void }[]>();
    for (const col of COLUMN_ORDER) map.set(col, []);

    for (const item of pendingSchedule) {
      map.get('PENDIENTE')?.push({
        key: item.id,
        title: item.templateNombre,
        subtitle: `${item.centroNombre} · ${item.fecha}`,
        onClick: () =>
          item.tipo === 'FORMULARIO'
            ? navigate(`/formularios/${item.formId}/completar?scheduleId=${item.id}`)
            : onStartSchedule(item),
      });
    }
    for (const inspection of inspections) {
      map.get(inspection.estado)?.push({
        key: inspection.id,
        title: inspection.templateNombre,
        subtitle: `${inspection.centroNombre} · ${inspection.fecha}`,
        onClick: () => navigate(`/inspecciones/${inspection.id}`),
      });
    }
    return map;
  }, [pendingSchedule, inspections, navigate, onStartSchedule]);

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, alignItems: 'flex-start' }}>
      {COLUMN_ORDER.map((col) => {
        const items = byColumn.get(col) ?? [];
        return (
          <Box key={col}>
            <Stack
              direction="row"
              sx={{
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1.5,
                pb: 1,
                borderBottom: '3px solid',
                borderColor: COLUMN_COLOR[col],
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {COLUMN_LABEL[col]}
              </Typography>
              <Chip label={items.length} size="small" />
            </Stack>

            <Stack spacing={1.5}>
              {items.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  Sin elementos en este estado.
                </Typography>
              )}
              {items.map((item) => (
                <Card
                  key={item.key}
                  variant="outlined"
                  sx={{ cursor: 'pointer', borderLeft: '4px solid', borderLeftColor: COLUMN_COLOR[col] }}
                  onClick={item.onClick}
                >
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {item.subtitle}
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
