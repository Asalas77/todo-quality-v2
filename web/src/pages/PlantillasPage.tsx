import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Chip,
  FormControlLabel,
  IconButton,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { AxiosError } from 'axios';
import { MainLayout } from '../components/MainLayout';
import { PlantillaFormDialog } from '../components/PlantillaFormDialog';
import { plantillasApi, FRECUENCIA_LABEL } from '../api/plantillas';
import type { ChecklistTemplateDetail, ChecklistTemplateInput } from '../api/plantillas';
import { useAuth } from '../context/AuthContext';

export function PlantillasPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('plantillas.gestionar');
  const queryClient = useQueryClient();

  const [includeInactive, setIncludeInactive] = useState(false);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplateDetail | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['plantillas', includeInactive],
    queryFn: () => plantillasApi.list(includeInactive),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['plantillas'] });

  const createMutation = useMutation({
    mutationFn: (input: ChecklistTemplateInput) => plantillasApi.create(input),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: ChecklistTemplateInput) =>
      plantillasApi.update(editingTemplate!.id, input),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });

  const toggleActivoMutation = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      plantillasApi.setActivo(id, activo),
    onSuccess: invalidate,
    onError: (error) => setErrorMessage(describeError(error)),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return templates;
    return templates.filter(
      (t) =>
        t.nombre.toLowerCase().includes(term) ||
        t.identificador.toLowerCase().includes(term),
    );
  }, [templates, search]);

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setDialogOpen(true);
  };

  const openEditDialog = async (id: string) => {
    try {
      const detail = await plantillasApi.get(id);
      setEditingTemplate(detail);
      setDialogOpen(true);
    } catch (error) {
      setErrorMessage(describeError(error));
    }
  };

  const handleSubmit = async (values: ChecklistTemplateInput) => {
    try {
      if (editingTemplate) {
        await updateMutation.mutateAsync(values);
      } else {
        await createMutation.mutateAsync(values);
      }
    } catch (error) {
      setErrorMessage(describeError(error));
    }
  };

  return (
    <MainLayout>
      <Card sx={{ p: 3 }}>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
        >
          <Typography variant="h5">Plantillas de checklist</Typography>
          {canManage && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
              Nueva plantilla
            </Button>
          )}
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
          <TextField
            label="Buscar por nombre o identificador"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 280 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
              />
            }
            label="Incluir inactivas"
          />
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Identificador</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Frecuencia</TableCell>
              <TableCell>Vigencia</TableCell>
              <TableCell align="center">Ítems</TableCell>
              <TableCell>Estado</TableCell>
              {canManage && <TableCell align="right">Acciones</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={canManage ? 7 : 6}>
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No hay plantillas para mostrar.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {filtered.map((template) => (
              <TableRow key={template.id} hover>
                <TableCell>{template.identificador}</TableCell>
                <TableCell>{template.nombre}</TableCell>
                <TableCell>{FRECUENCIA_LABEL[template.frecuencia]}</TableCell>
                <TableCell>{template.vigencia}</TableCell>
                <TableCell align="center">{template.itemCount}</TableCell>
                <TableCell>
                  <Chip
                    label={template.activo ? 'Activa' : 'Inactiva'}
                    color={template.activo ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                {canManage && (
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEditDialog(template.id)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() =>
                        toggleActivoMutation.mutate({
                          id: template.id,
                          activo: !template.activo,
                        })
                      }
                      title={template.activo ? 'Desactivar' : 'Reactivar'}
                    >
                      {template.activo ? (
                        <BlockIcon fontSize="small" />
                      ) : (
                        <CheckCircleIcon fontSize="small" />
                      )}
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <PlantillaFormDialog
        open={dialogOpen}
        template={editingTemplate}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      />

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={5000}
        onClose={() => setErrorMessage(null)}
      >
        <Alert severity="error" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
}

function describeError(error: unknown): string {
  const response = (error as AxiosError<{ message?: string | string[] }>).response;
  const message = response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message ?? 'Ocurrió un error inesperado.';
}
