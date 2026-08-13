import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Button, CircularProgress, Dialog, Stack, Typography } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { AxiosError } from 'axios';
import { http } from '../api/http';
import { inspeccionesApi } from '../api/inspecciones';

interface EvidenciaFotoProps {
  inspectionId: string;
  templateItemId: string;
  hasEvidencia: boolean;
  canEdit: boolean;
}

export function EvidenciaFoto({
  inspectionId,
  templateItemId,
  hasEvidencia,
  canEdit,
}: EvidenciaFotoProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Se independiza de hasEvidencia (prop derivada de la inspección completa) para que
  // subir una foto nunca dependa de refrescar esa query — ver comentario en la mutación.
  const [justUploaded, setJustUploaded] = useState(false);
  const showsEvidencia = hasEvidencia || justUploaded;

  const thumbnailQuery = useQuery({
    queryKey: ['evidencia', inspectionId, templateItemId],
    queryFn: () =>
      http
        .get(inspeccionesApi.evidenciaEndpoint(inspectionId, templateItemId), {
          responseType: 'blob',
        })
        .then((r) => URL.createObjectURL(r.data as Blob)),
    enabled: showsEvidencia,
    staleTime: Infinity,
  });

  // Los blob: URL solo viven en memoria del navegador — hay que liberarlos al desmontar
  // o al reemplazar la foto, o se acumulan sin límite en una sesión larga.
  useEffect(() => {
    const url = thumbnailQuery.data;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [thumbnailQuery.data]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => inspeccionesApi.uploadEvidencia(inspectionId, templateItemId, file),
    onSuccess: () => {
      setError(null);
      setJustUploaded(true);
      // Deliberadamente NO se invalida ['inspeccion', id]: ese refetch dispara el
      // useEffect de CompletarInspeccionPage que reconstruye el estado local de TODAS
      // las respuestas desde el servidor, borrando cualquier edición sin guardar del
      // usuario (la respuesta que acaba de elegir, un plan de acción a medio escribir).
      // Solo se refresca la miniatura de este ítem.
      queryClient.invalidateQueries({ queryKey: ['evidencia', inspectionId, templateItemId] });
    },
    onError: (err) => {
      const response = (err as AxiosError<{ message?: string }>).response;
      setError(response?.data?.message ?? 'No se pudo subir la foto.');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = '';
  };

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleFileChange}
      />

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        {showsEvidencia && (
          <>
            {thumbnailQuery.isLoading ? (
              <CircularProgress size={40} />
            ) : thumbnailQuery.data ? (
              <Box
                component="img"
                src={thumbnailQuery.data}
                onClick={() => setPreview(true)}
                sx={{
                  width: 56,
                  height: 56,
                  objectFit: 'cover',
                  borderRadius: 1,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
            ) : null}
          </>
        )}

        {canEdit && (
          <Button
            size="small"
            startIcon={
              uploadMutation.isPending ? <CircularProgress size={16} /> : <PhotoCameraIcon />
            }
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            {showsEvidencia ? 'Cambiar foto' : 'Agregar foto'}
          </Button>
        )}
      </Stack>

      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}

      <Dialog open={preview} onClose={() => setPreview(false)} maxWidth="md">
        {thumbnailQuery.data && (
          <Box component="img" src={thumbnailQuery.data} sx={{ width: '100%', display: 'block' }} />
        )}
      </Dialog>
    </Box>
  );
}
