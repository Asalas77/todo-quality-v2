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
import { MainLayout } from '../components/MainLayout';
import { CentroFormDialog } from '../components/CentroFormDialog';
import { centrosApi } from '../api/centros';
import type { Centro, CentroInput } from '../api/centros';
import { useAuth } from '../context/AuthContext';
import { AxiosError } from 'axios';

export function CentrosPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('centros.gestionar');
  const queryClient = useQueryClient();

  const [includeInactive, setIncludeInactive] = useState(false);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCentro, setEditingCentro] = useState<Centro | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: centros = [], isLoading } = useQuery({
    queryKey: ['centros', includeInactive],
    queryFn: () => centrosApi.list(includeInactive),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['centros'] });

  const createMutation = useMutation({
    mutationFn: (input: CentroInput) => centrosApi.create(input),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: CentroInput) => centrosApi.update(editingCentro!.id, input),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });

  const toggleActivoMutation = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      centrosApi.setActivo(id, activo),
    onSuccess: invalidate,
    onError: (error) => {
      setErrorMessage(describeError(error));
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return centros;
    return centros.filter((c) => c.nombre.toLowerCase().includes(term));
  }, [centros, search]);

  const openCreateDialog = () => {
    setEditingCentro(null);
    setDialogOpen(true);
  };

  const openEditDialog = (centro: Centro) => {
    setEditingCentro(centro);
    setDialogOpen(true);
  };

  const handleSubmit = async (values: CentroInput) => {
    try {
      if (editingCentro) {
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
          <Typography variant="h5">Centros</Typography>
          {canManage && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
              Nuevo centro
            </Button>
          )}
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
          <TextField
            label="Buscar por nombre"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 260 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
              />
            }
            label="Incluir inactivos"
          />
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Dirección</TableCell>
              <TableCell>Estado</TableCell>
              {canManage && <TableCell align="right">Acciones</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={canManage ? 4 : 3}>
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No hay centros para mostrar.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {filtered.map((centro) => (
              <TableRow key={centro.id} hover>
                <TableCell>{centro.nombre}</TableCell>
                <TableCell>{centro.direccion}</TableCell>
                <TableCell>
                  <Chip
                    label={centro.activo ? 'Activo' : 'Inactivo'}
                    color={centro.activo ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                {canManage && (
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEditDialog(centro)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() =>
                        toggleActivoMutation.mutate({
                          id: centro.id,
                          activo: !centro.activo,
                        })
                      }
                      title={centro.activo ? 'Desactivar' : 'Reactivar'}
                    >
                      {centro.activo ? (
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

      <CentroFormDialog
        open={dialogOpen}
        centro={editingCentro}
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
