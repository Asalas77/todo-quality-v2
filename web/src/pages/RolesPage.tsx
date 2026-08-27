import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { AxiosError } from 'axios';
import { MainLayout } from '../components/MainLayout';
import { PageLoader } from '../components/PageLoader';
import { RoleFormDialog } from '../components/RoleFormDialog';
import { rolesApi } from '../api/roles';
import type { Role } from '../api/roles';

export function RolesPage() {
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list(),
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['permisos'],
    queryFn: () => rolesApi.listPermissions(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['roles'] });

  const createMutation = useMutation({
    mutationFn: rolesApi.create,
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: { nombre: string; descripcion?: string; permissionCodes: string[] }) =>
      rolesApi.update(editingRole!.id, input),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rolesApi.remove(id),
    onSuccess: invalidate,
    onError: (error) => setErrorMessage(describeError(error)),
  });

  const openCreateDialog = () => {
    setEditingRole(null);
    setDialogOpen(true);
  };

  const openEditDialog = (role: Role) => {
    setEditingRole(role);
    setDialogOpen(true);
  };

  const handleSubmit = async (values: {
    nombre: string;
    descripcion?: string;
    permissionCodes: string[];
  }) => {
    if (editingRole) {
      await updateMutation.mutateAsync(values);
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  return (
    <MainLayout>
      <Card sx={{ p: 3 }}>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
        >
          <Typography variant="h5">Roles</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            Nuevo rol
          </Button>
        </Stack>

        {isLoading ? (
          <PageLoader />
        ) : (
        <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell align="center">Permisos</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No hay roles para mostrar.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {roles.map((role) => (
              <TableRow key={role.id} hover>
                <TableCell>{role.nombre}</TableCell>
                <TableCell>{role.descripcion ?? '—'}</TableCell>
                <TableCell align="center">{role.permissionCodes.length}</TableCell>
                <TableCell>
                  <Chip
                    label={role.esSistema ? 'Sistema' : 'Personalizado'}
                    size="small"
                    color={role.esSistema ? 'default' : 'primary'}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEditDialog(role)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={role.esSistema}
                    title={role.esSistema ? 'Los roles de sistema no se pueden eliminar' : 'Eliminar'}
                    onClick={() => deleteMutation.mutate(role.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </Box>
        )}
      </Card>

      <RoleFormDialog
        open={dialogOpen}
        role={editingRole}
        permissions={permissions}
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
