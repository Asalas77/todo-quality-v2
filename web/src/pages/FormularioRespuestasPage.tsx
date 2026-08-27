import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PrintIcon from '@mui/icons-material/Print';
import { formulariosApi } from '../api/formularios';
import { http } from '../api/http';
import { MainLayout } from '../components/MainLayout';
import { PageLoader } from '../components/PageLoader';
import { FormularioRespuestaPrintView } from '../components/FormularioRespuestaPrintView';

async function openArchivo(responseId: string, campoId: string) {
  const { data } = await http.get(formulariosApi.archivoEndpoint(responseId, campoId), {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(data as Blob);
  window.open(url, '_blank');
}

function FotoThumbnail({ responseId, campoId }: { responseId: string; campoId: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    http
      .get(formulariosApi.archivoEndpoint(responseId, campoId), { responseType: 'blob' })
      .then(({ data }) => {
        objectUrl = URL.createObjectURL(data as Blob);
        setSrc(objectUrl);
      })
      .catch(() => setSrc(null));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [responseId, campoId]);

  if (!src) return <CircularProgress size={20} />;
  return (
    <Box
      component="img"
      src={src}
      alt="Foto adjunta"
      onClick={() => window.open(src, '_blank')}
      sx={{ maxWidth: 200, maxHeight: 200, borderRadius: 1, cursor: 'pointer', display: 'block' }}
    />
  );
}

export function FormularioRespuestasPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [openResponseId, setOpenResponseId] = useState<string | null>(
    searchParams.get('responseId'),
  );

  const { data: form } = useQuery({
    queryKey: ['formulario', id],
    queryFn: () => formulariosApi.get(id!),
    enabled: !!id,
  });

  const { data: responses = [], isLoading } = useQuery({
    queryKey: ['formulario-respuestas', id],
    queryFn: () => formulariosApi.listResponses(id!),
    enabled: !!id,
  });

  const { data: responseDetail, isError: isResponseError } = useQuery({
    queryKey: ['formulario-respuesta', openResponseId],
    queryFn: () => formulariosApi.getResponse(openResponseId!),
    enabled: !!openResponseId,
    retry: false,
  });

  return (
    <MainLayout>
      <Card sx={{ p: 3 }} className="no-print">
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h5">Respuestas: {form?.nombre ?? '…'}</Typography>
          <Link component={RouterLink} to="/agenda">
            Volver a agenda
          </Link>
        </Stack>

        {isLoading ? (
          <PageLoader />
        ) : (
        <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Centro</TableCell>
              <TableCell>Completado por</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {responses.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    Todavía no hay respuestas para este formulario.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {responses.map((response) => (
              <TableRow key={response.id} hover>
                <TableCell>{new Date(response.createdAt).toLocaleString()}</TableCell>
                <TableCell>{response.centroNombre ?? '—'}</TableCell>
                <TableCell>{response.creadoPorNombre}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => setOpenResponseId(response.id)}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </Box>
        )}
      </Card>

      <Dialog
        open={!!openResponseId}
        onClose={() => setOpenResponseId(null)}
        maxWidth="sm"
        fullWidth
        className="no-print"
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Respuesta: {form?.nombre ?? '…'}
          {responseDetail && !isResponseError && (
            <Button
              size="small"
              startIcon={<PrintIcon fontSize="small" />}
              onClick={() => window.print()}
            >
              Imprimir / Exportar
            </Button>
          )}
        </DialogTitle>
        <DialogContent>
          {isResponseError ? (
            <Typography color="error" sx={{ py: 2 }}>
              No tienes permiso para ver esta respuesta.
            </Typography>
          ) : !responseDetail ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box
                sx={{
                  pb: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  columnGap: 1.5,
                  rowGap: 0.5,
                }}
              >
                <Typography variant="body2" color="text.secondary">Centro</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {responseDetail.centroNombre ?? 'Sin centro'}
                </Typography>
                <Typography variant="body2" color="text.secondary">Completado por</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {responseDetail.creadoPorNombre}
                </Typography>
                <Typography variant="body2" color="text.secondary">Fecha</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {new Date(responseDetail.createdAt).toLocaleString()}
                </Typography>
              </Box>
              {responseDetail.valores.map((valor) => (
                <Box key={valor.campoId}>
                  <Typography variant="subtitle2">{valor.campoEtiqueta}</Typography>
                  {valor.campoTipo === 'FOTO' && valor.archivoUrl ? (
                    <FotoThumbnail responseId={responseDetail.id} campoId={valor.campoId} />
                  ) : valor.campoTipo === 'ARCHIVO' && valor.archivoUrl ? (
                    <Button
                      size="small"
                      onClick={() => openArchivo(responseDetail.id, valor.campoId)}
                    >
                      Ver archivo
                    </Button>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {valor.valorOpciones?.join(', ') || valor.valorTexto || valor.valorFecha || '—'}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {responseDetail && !isResponseError && (
        <FormularioRespuestaPrintView
          response={responseDetail}
          formNombre={form?.nombre ?? ''}
        />
      )}
    </MainLayout>
  );
}
