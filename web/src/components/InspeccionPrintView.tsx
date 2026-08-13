import { useEffect, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { http } from '../api/http';
import { inspeccionesApi, ESTADO_LABEL, RESPUESTA_LABEL } from '../api/inspecciones';
import type { InspectionDetail } from '../api/inspecciones';

interface InspeccionPrintViewProps {
  inspection: InspectionDetail;
}

/** Precarga las fotos de evidencia como blob: URL para que aparezcan en la vista de impresión. */
function useEvidenciaPhotos(inspection: InspectionDetail): Record<string, string> {
  const [photos, setPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    const itemsWithPhoto = inspection.answers.filter((a) => a.evidenciaUrl);
    const urls: string[] = [];

    Promise.all(
      itemsWithPhoto.map((item) =>
        http
          .get(inspeccionesApi.evidenciaEndpoint(inspection.id, item.templateItemId), {
            responseType: 'blob',
          })
          .then((r) => {
            const url = URL.createObjectURL(r.data as Blob);
            urls.push(url);
            return [item.templateItemId, url] as const;
          })
          .catch(() => null),
      ),
    ).then((entries) => {
      setPhotos(Object.fromEntries(entries.filter((e): e is [string, string] => e !== null)));
    });

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspection.id]);

  return photos;
}

export function InspeccionPrintView({ inspection }: InspeccionPrintViewProps) {
  const photos = useEvidenciaPhotos(inspection);

  return (
    <Box className="print-only" sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        {inspection.templateNombre}
      </Typography>
      <Typography sx={{ mb: 2 }}>
        Centro: {inspection.centroNombre} · Fecha: {inspection.fecha} · Encargado:{' '}
        {inspection.inspectorNombre} · Estado: {ESTADO_LABEL[inspection.estado]}
      </Typography>

      <Stack spacing={2}>
        {inspection.answers.map((item, index) => (
          <Box key={item.templateItemId} sx={{ pageBreakInside: 'avoid', borderBottom: '1px solid #ccc', pb: 1.5 }}>
            <Typography variant="subtitle1">
              {index + 1}. {item.itemDescripcion}{' '}
              <Typography component="span" variant="body2" color="text.secondary">
                ({item.itemCriticidad === 'CRITICO' ? 'Crítico' : 'Básico'})
              </Typography>
            </Typography>
            <Typography variant="body2">
              Respuesta: {item.estado ? RESPUESTA_LABEL[item.estado] : 'Sin responder'}
            </Typography>
            {item.observacion && (
              <Typography variant="body2">Observación: {item.observacion}</Typography>
            )}
            {item.estado === 'NO_CUMPLE' && (
              <>
                <Typography variant="body2">Plan de acción: {item.planAccion ?? '—'}</Typography>
                <Typography variant="body2">
                  Fecha de compromiso: {item.fechaCompromiso ?? '—'} · Fecha de control:{' '}
                  {item.fechaControl ?? '—'} · Responsable: {item.responsable ?? '—'}
                </Typography>
                {photos[item.templateItemId] && (
                  <Box
                    component="img"
                    src={photos[item.templateItemId]}
                    sx={{ mt: 1, maxWidth: 240, maxHeight: 240, display: 'block' }}
                  />
                )}
              </>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
