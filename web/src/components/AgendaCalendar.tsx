import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import type { InspectionStatus, InspectionSummary } from '../api/inspecciones';
import { ESTADO_LABEL } from '../api/inspecciones';
import type { Schedule } from '../api/agenda';
import type { FormResponseWithForm } from '../api/formularios';

type CalendarDotColor = InspectionStatus | 'PENDIENTE' | 'FORMULARIO';

const DOT_COLOR: Record<CalendarDotColor, string> = {
  PENDIENTE: '#1565c0',
  BORRADOR: '#9e9e9e',
  CONFORME: '#2e7d32',
  NO_CONFORME: '#c62828',
  FORMULARIO: '#f97316',
};

const DOT_LABEL: Record<CalendarDotColor, string> = {
  PENDIENTE: 'Pendiente',
  ...ESTADO_LABEL,
  FORMULARIO: 'Formulario',
};

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DIAS_SEMANA_CORTO = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function buildMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
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

type CalendarEntry =
  | { kind: 'schedule'; id: string; fecha: string; label: string; schedule: Schedule }
  | { kind: 'inspection'; id: string; fecha: string; label: string; estado: InspectionStatus }
  | { kind: 'formResponse'; id: string; fecha: string; label: string; formId: string };

interface AgendaCalendarProps {
  pendingSchedule: Schedule[];
  inspections: InspectionSummary[];
  formResponses: FormResponseWithForm[];
  onStartSchedule: (item: Schedule) => void;
}

export function AgendaCalendar({
  pendingSchedule,
  inspections,
  formResponses,
  onStartSchedule,
}: AgendaCalendarProps) {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const entries = useMemo<CalendarEntry[]>(() => {
    const scheduleEntries: CalendarEntry[] = pendingSchedule.map((item) => ({
      kind: 'schedule',
      id: item.id,
      fecha: item.fecha,
      label: `${item.templateNombre} · ${item.centroNombre} · ${item.asignadoNombre}`,
      schedule: item,
    }));
    const inspectionEntries: CalendarEntry[] = inspections.map((inspection) => ({
      kind: 'inspection',
      id: inspection.id,
      fecha: inspection.fecha,
      label: `${inspection.templateNombre} · ${inspection.centroNombre} · ${inspection.inspectorNombre}`,
      estado: inspection.estado,
    }));
    const formEntries: CalendarEntry[] = formResponses.map((response) => ({
      kind: 'formResponse',
      id: response.id,
      fecha: response.createdAt.slice(0, 10),
      label: `${response.formNombre} · ${response.centroNombre ?? 'Sin centro'} · ${response.creadoPorNombre}`,
      formId: response.formId,
    }));
    return [...scheduleEntries, ...inspectionEntries, ...formEntries];
  }, [pendingSchedule, inspections, formResponses]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.fecha) ?? [];
      list.push(entry);
      map.set(entry.fecha, list);
    }
    return map;
  }, [entries]);

  const days = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const todayKey = toDateKey(today);

  const handleEntryClick = (entry: CalendarEntry) => {
    setSelectedDay(null);
    if (entry.kind === 'inspection') {
      navigate(`/inspecciones/${entry.id}`);
      return;
    }
    if (entry.kind === 'formResponse') {
      navigate(`/formularios/${entry.formId}/respuestas?responseId=${entry.id}`);
      return;
    }
    if (entry.schedule.tipo === 'FORMULARIO') {
      navigate(`/formularios/${entry.schedule.formId}/completar?scheduleId=${entry.schedule.id}`);
      return;
    }
    onStartSchedule(entry.schedule);
  };

  function dotColorFor(entry: CalendarEntry): string {
    if (entry.kind === 'schedule') return DOT_COLOR.PENDIENTE;
    if (entry.kind === 'formResponse') return DOT_COLOR.FORMULARIO;
    return DOT_COLOR[entry.estado];
  }

  const selectedDayKey = selectedDay ? toDateKey(selectedDay) : null;
  const selectedDayEntries = selectedDayKey ? (byDate.get(selectedDayKey) ?? []) : [];

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

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.5 }}>
        {DIAS_SEMANA.map((dia, i) => (
          <Typography key={dia} variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontWeight: 600 }}>
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{dia}</Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>{DIAS_SEMANA_CORTO[i]}</Box>
          </Typography>
        ))}

        {days.map((day) => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const key = toDateKey(day);
          const dayEntries = byDate.get(key) ?? [];
          const isToday = key === todayKey;

          return (
            <Box
              key={key}
              onClick={() => dayEntries.length > 0 && setSelectedDay(day)}
              sx={{
                minWidth: 0,
                minHeight: { xs: 64, sm: 92 },
                p: 0.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: inMonth ? 'background.paper' : 'grey.50',
                opacity: inMonth ? 1 : 0.5,
                cursor: dayEntries.length > 0 ? 'pointer' : 'default',
                '&:hover': dayEntries.length > 0 ? { borderColor: 'primary.main' } : undefined,
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
                {dayEntries.slice(0, 3).map((entry) => (
                  <Chip
                    key={`${entry.kind}-${entry.id}`}
                    size="small"
                    label={entry.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEntryClick(entry);
                    }}
                    sx={{
                      height: 18,
                      maxWidth: '100%',
                      fontSize: '0.65rem',
                      justifyContent: 'flex-start',
                      bgcolor: dotColorFor(entry),
                      color: 'white',
                      cursor: 'pointer',
                      '& .MuiChip-label': {
                        px: 0.75,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      },
                    }}
                  />
                ))}
                {dayEntries.length > 3 && (
                  <Typography variant="caption" color="text.secondary">
                    +{dayEntries.length - 3} más
                  </Typography>
                )}
              </Stack>
            </Box>
          );
        })}
      </Box>

      <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
        {(Object.keys(DOT_LABEL) as CalendarDotColor[]).map((estado) => (
          <Stack key={estado} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: DOT_COLOR[estado] }} />
            <Typography variant="caption">{DOT_LABEL[estado]}</Typography>
          </Stack>
        ))}
      </Stack>

      <Dialog open={!!selectedDay} onClose={() => setSelectedDay(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {selectedDay &&
            `${selectedDay.getDate()} de ${MESES[selectedDay.getMonth()].toLowerCase()} de ${selectedDay.getFullYear()}`}
          <IconButton size="small" onClick={() => setSelectedDay(null)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            {selectedDayEntries.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Sin eventos este día.
              </Typography>
            )}
            {selectedDayEntries.map((entry) => (
              <Box
                key={`${entry.kind}-${entry.id}`}
                onClick={() => handleEntryClick(entry)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    flexShrink: 0,
                    bgcolor: dotColorFor(entry),
                  }}
                />
                <Typography variant="body2">{entry.label}</Typography>
              </Box>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
