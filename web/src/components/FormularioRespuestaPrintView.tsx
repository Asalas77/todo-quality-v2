import { useEffect, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { http } from '../api/http';
import { formulariosApi } from '../api/formularios';
import type { FormResponseDetail } from '../api/formularios';

interface FormularioRespuestaPrintViewProps {
  response: FormResponseDetail;
  formNombre: string;
}

/** Precarga fotos/archivos como blob: URL para que aparezcan en la vista de impresión. */
function useArchivos(response: FormResponseDetail): Record<string, string> {
  const [archivos, setArchivos] = useState<Record<string, string>>({});

  useEffect(() => {
    const camposConArchivo = response.valores.filter(
      (v) => v.campoTipo === 'FOTO' && v.archivoUrl,
    );
    const urls: string[] = [];

    Promise.all(
      camposConArchivo.map((valor) =>
        http
          .get(formulariosApi.archivoEndpoint(response.id, valor.campoId), {
            responseType: 'blob',
          })
          .then((r) => {
            const url = URL.createObjectURL(r.data as Blob);
            urls.push(url);
            return [valor.campoId, url] as const;
          })
          .catch(() => null),
      ),
    ).then((entries) => {
      setArchivos(Object.fromEntries(entries.filter((e): e is [string, string] => e !== null)));
    });

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response.id]);

  return archivos;
}

export function FormularioRespuestaPrintView({
  response,
  formNombre,
}: FormularioRespuestaPrintViewProps) {
  const fotos = useArchivos(response);

  return (
    <Box className="print-only" sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        {formNombre}
      </Typography>
      <Typography sx={{ mb: 2 }}>
        Centro: {response.centroNombre ?? 'Sin centro'} · Fecha:{' '}
        {new Date(response.createdAt).toLocaleString()} · Completado por:{' '}
        {response.creadoPorNombre}
      </Typography>

      <Stack spacing={2}>
        {response.valores.map((valor, index) => (
          <Box
            key={valor.campoId}
            sx={{ pageBreakInside: 'avoid', borderBottom: '1px solid #ccc', pb: 1.5 }}
          >
            <Typography variant="subtitle1">
              {index + 1}. {valor.campoEtiqueta}
            </Typography>
            {valor.campoTipo === 'FOTO' && fotos[valor.campoId] ? (
              <Box
                component="img"
                src={fotos[valor.campoId]}
                sx={{ mt: 1, maxWidth: 240, maxHeight: 240, display: 'block' }}
              />
            ) : valor.campoTipo === 'ARCHIVO' && valor.archivoUrl ? (
              <Typography variant="body2" color="text.secondary">
                (archivo adjunto — ver en la app)
              </Typography>
            ) : (
              <Typography variant="body2">
                {valor.valorOpciones?.join(', ') || valor.valorTexto || valor.valorFecha || '—'}
              </Typography>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
