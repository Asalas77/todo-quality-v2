import { Box, CircularProgress } from '@mui/material';

/** Spinner centrado para reemplazar el contenido de una pantalla mientras carga su data. */
export function PageLoader({ minHeight = 240 }: { minHeight?: number }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight, py: 4 }}>
      <CircularProgress />
    </Box>
  );
}
