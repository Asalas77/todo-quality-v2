import { Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TrendPoint } from '../api/reportes';

interface TrendChartProps {
  data: TrendPoint[];
  isLoading: boolean;
}

export function TrendChart({ data, isLoading }: TrendChartProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" gutterBottom>
          Inspecciones por día
        </Typography>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : data.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
            No hay inspecciones completadas en este período.
          </Typography>
        ) : (
          <Box sx={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="conformes"
                  name="Conformes"
                  stroke="#2e7d32"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="noConformes"
                  name="No conformes"
                  stroke="#c62828"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
