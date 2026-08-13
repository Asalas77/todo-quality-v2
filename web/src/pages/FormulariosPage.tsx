import { useState } from 'react';
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
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { AxiosError } from 'axios';
import { MainLayout } from '../components/MainLayout';
import { FormBuilderDialog } from '../components/FormBuilderDialog';
import { formulariosApi } from '../api/formularios';
import type { FormDetail, FormInput } from '../api/formularios';
import { useAuth } from '../context/AuthContext';

export function FormulariosPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('formularios.gestionar');
  const canComplete = hasPermission('formularios.completar');
  const queryClient = useQueryClient();

  const [includeInactive, setIncludeInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<FormDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ['formularios', includeInactive],
    queryFn: () => formulariosApi.list(includeInactive),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['formularios'] });

  const createMutation = useMutation({
    mutationFn: (input: FormInput) => formulariosApi.create(input),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: FormInput) => formulariosApi.update(editingForm!.id, input),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });

  const toggleActivoMutation = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      formulariosApi.setActivo(id, activo),
    onSuccess: invalidate,
    onError: (error) => setErrorMessage(describeError(error)),
  });

  const openCreateDialog = () => {
    setEditingForm(null);
    setDialogOpen(true);
  };

  const openEditDialog = async (id: string) => {
    try {
      const detail = await formulariosApi.get(id);
      setEditingForm(detail);
      setDialogOpen(true);
    } catch (error) {
      setErrorMessage(describeError(error));
    }
  };

  const handleSubmit = async (values: FormInput) => {
    try {
      if (editingForm) {
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
          <Typography variant="h5">Formularios</Typography>
          {canManage && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
              Nuevo formulario
            </Button>
          )}
        </Stack>

        <FormControlLabel
          sx={{ mb: 2 }}
          control={
            <Switch
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
          }
          label="Incluir inactivos"
        />

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell align="center">Campos</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!isLoading && forms.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No hay formularios para mostrar.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {forms.map((form) => (
              <TableRow key={form.id} hover>
                <TableCell>{form.nombre}</TableCell>
                <TableCell>{form.descripcion ?? '—'}</TableCell>
                <TableCell align="center">{form.fieldCount}</TableCell>
                <TableCell>
                  <Chip
                    label={form.activo ? 'Activo' : 'Inactivo'}
                    color={form.activo ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  {canComplete && form.activo && (
                    <IconButton
                      size="small"
                      title="Completar"
                      component={RouterLink}
                      to={`/formularios/${form.id}/completar`}
                    >
                      <PlaylistAddCheckIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    title="Ver respuestas"
                    component={RouterLink}
                    to={`/formularios/${form.id}/respuestas`}
                  >
                    <ListAltIcon fontSize="small" />
                  </IconButton>
                  {canManage && (
                    <>
                      <IconButton size="small" onClick={() => openEditDialog(form.id)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() =>
                          toggleActivoMutation.mutate({ id: form.id, activo: !form.activo })
                        }
                        title={form.activo ? 'Desactivar' : 'Reactivar'}
                      >
                        {form.activo ? (
                          <BlockIcon fontSize="small" />
                        ) : (
                          <CheckCircleIcon fontSize="small" />
                        )}
                      </IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <FormBuilderDialog
        open={dialogOpen}
        form={editingForm}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      />

      <Snackbar open={!!errorMessage} autoHideDuration={5000} onClose={() => setErrorMessage(null)}>
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
