import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import type { CentroConformidad } from '../api/reportes';

interface CentroConformidadCardProps {
  data: CentroConformidad[];
  isLoading: boolean;
}

export function CentroConformidadCard({ data, isLoading }: CentroConformidadCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" gutterBottom>
          Conformidad por centro
        </Typography>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : data.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No hay centros activos.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {data.map((centro) => (
              <Box key={centro.centroId}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">{centro.centroNombre}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {centro.total === 0
                      ? 'Sin inspecciones'
                      : `${centro.porcentajeConformidad}% (${centro.conformes}/${centro.total})`}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={centro.total === 0 ? 0 : centro.porcentajeConformidad}
                  color={centro.porcentajeConformidad >= 80 ? 'success' : centro.porcentajeConformidad >= 50 ? 'warning' : 'error'}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
