import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { MainLayout } from '../components/MainLayout';
import { PageLoader } from '../components/PageLoader';
import { comentariosApi } from '../api/comentarios';

export function ComentariosPage() {
  const { data: comentarios = [], isLoading } = useQuery({
    queryKey: ['comentarios'],
    queryFn: () => comentariosApi.list(),
  });

  return (
    <MainLayout>
      <Card sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Comentarios y soporte
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Comentarios enviados por los usuarios de tu empresa desde "Soporte y comentarios".
        </Typography>

        {isLoading ? (
          <PageLoader />
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Comentario</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {comentarios.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        Todavía no hay comentarios.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {comentarios.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {new Date(c.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {c.usuarioNombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.usuarioEmail}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'pre-wrap' }}>{c.mensaje}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>
    </MainLayout>
  );
}
