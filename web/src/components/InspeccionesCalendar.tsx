import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Chip, IconButton, Stack, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { ESTADO_LABEL } from '../api/inspecciones';
import type { InspectionStatus, InspectionSummary } from '../api/inspecciones';

const ESTADO_DOT_COLOR: Record<InspectionStatus, string> = {
  BORRADOR: '#9e9e9e',
  CONFORME: '#2e7d32',
  NO_CONFORME: '#c62828',
};

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function buildMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  // Lunes = 0 ... Domingo = 6 (getDay() da 0=Domingo)
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - leadingBlanks);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface InspeccionesCalendarProps {
  inspections: InspectionSummary[];
}

export function InspeccionesCalendar({ inspections }: InspeccionesCalendarProps) {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const byDate = useMemo(() => {
    const map = new Map<string, InspectionSummary[]>();
    for (const inspection of inspections) {
      const list = map.get(inspection.fecha) ?? [];
      list.push(inspection);
      map.set(inspection.fecha, list);
    }
    return map;
  }, [inspections]);

  const days = useMemo(
    () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );

  const todayKey = toDateKey(today);

  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'center', mb: 2, gap: 1 }}>
        <IconButton onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="h6" sx={{ minWidth: 200, textAlign: 'center' }}>
          {MESES[cursor.getMonth()]} {cursor.getFullYear()}
        </Typography>
        <IconButton onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}>
          <ChevronRightIcon />
        </IconButton>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
        {DIAS_SEMANA.map((dia) => (
          <Typography key={dia} variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontWeight: 600 }}>
            {dia}
          </Typography>
        ))}

        {days.map((day) => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const key = toDateKey(day);
          const dayInspections = byDate.get(key) ?? [];
          const isToday = key === todayKey;

          return (
            <Box
              key={key}
              sx={{
                minHeight: 92,
                p: 0.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: inMonth ? 'background.paper' : 'grey.50',
                opacity: inMonth ? 1 : 0.5,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? 'primary.main' : 'text.secondary',
                }}
              >
                {day.getDate()}
              </Typography>
              <Stack spacing={0.25} sx={{ mt: 0.25 }}>
                {dayInspections.slice(0, 3).map((inspection) => (
                  <Chip
                    key={inspection.id}
                    size="small"
                    label={inspection.centroNombre}
                    onClick={() => navigate(`/inspecciones/${inspection.id}`)}
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      justifyContent: 'flex-start',
                      bgcolor: ESTADO_DOT_COLOR[inspection.estado],
                      color: 'white',
                      cursor: 'pointer',
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                ))}
                {dayInspections.length > 3 && (
                  <Typography variant="caption" color="text.secondary">
                    +{dayInspections.length - 3} más
                  </Typography>
                )}
              </Stack>
            </Box>
          );
        })}
      </Box>

      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
        {(Object.keys(ESTADO_LABEL) as InspectionStatus[]).map((estado) => (
          <Stack key={estado} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ESTADO_DOT_COLOR[estado] }} />
            <Typography variant="caption">{ESTADO_LABEL[estado]}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
