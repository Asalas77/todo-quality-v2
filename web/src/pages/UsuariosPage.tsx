import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
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
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockResetIcon from '@mui/icons-material/LockReset';
import { AxiosError } from 'axios';
import { MainLayout } from '../components/MainLayout';
import { PageLoader } from '../components/PageLoader';
import { UserFormDialog } from '../components/UserFormDialog';
import { TemporaryPasswordDialog } from '../components/TemporaryPasswordDialog';
import { usuariosApi } from '../api/usuarios';
import type { CreatedUser, User } from '../api/usuarios';
import { rolesApi } from '../api/roles';
import { useAuth } from '../context/AuthContext';

export function UsuariosPage() {
  const { hasPermission, user: currentUser } = useAuth();
  const canManage = hasPermission('usuarios.gestionar');
  const queryClient = useQueryClient();

  const [includeInactive, setIncludeInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);
  const [passwordDialogTitle, setPasswordDialogTitle] = useState('Usuario creado');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['usuarios', includeInactive],
    queryFn: () => usuariosApi.list(includeInactive),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list(),
    enabled: canManage,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['usuarios'] });

  const createMutation = useMutation({
    mutationFn: usuariosApi.create,
    onSuccess: (created) => {
      invalidate();
      setDialogOpen(false);
      setPasswordDialogTitle('Usuario creado');
      setCreatedUser(created);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: { nombre: string; apellido: string; rut?: string; roleId: string }) =>
      usuariosApi.update(editingUser!.id, input),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });

  const toggleActivoMutation = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      usuariosApi.setActivo(id, activo),
    onSuccess: invalidate,
    onError: (error) => setErrorMessage(describeError(error)),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) => usuariosApi.resetPassword(id),
    onSuccess: (result, id) => {
      const target = users.find((u) => u.id === id);
      if (target) {
        setPasswordDialogTitle('Contraseña reseteada');
        setCreatedUser({ ...target, temporaryPassword: result.temporaryPassword });
      }
    },
    onError: (error) => setErrorMessage(describeError(error)),
  });

  const openCreateDialog = () => {
    setEditingUser(null);
    setDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const handleSubmit = async (values: {
    nombre: string;
    apellido: string;
    email: string;
    rut?: string;
    roleId: string;
  }) => {
    if (editingUser) {
      await updateMutation.mutateAsync({
        nombre: values.nombre,
        apellido: values.apellido,
        rut: values.rut,
        roleId: values.roleId,
      });
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
          <Typography variant="h5">Usuarios</Typography>
          {canManage && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
              Nuevo usuario
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

        {isLoading ? (
          <PageLoader />
        ) : (
        <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Correo</TableCell>
              <TableCell>RUT</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Estado</TableCell>
              {canManage && <TableCell align="right">Acciones</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={canManage ? 6 : 5}>
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No hay usuarios para mostrar.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>{user.nombre} {user.apellido}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.rut ?? '—'}</TableCell>
                <TableCell>{user.roleNombre}</TableCell>
                <TableCell>
                  <Chip
                    label={user.activo ? 'Activo' : 'Inactivo'}
                    color={user.activo ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                {canManage && (
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEditDialog(user)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      disabled={user.id === currentUser?.userId && user.activo}
                      title={
                        user.id === currentUser?.userId && user.activo
                          ? 'No puedes desactivar tu propia cuenta'
                          : user.activo
                            ? 'Desactivar'
                            : 'Reactivar'
                      }
                      onClick={() =>
                        toggleActivoMutation.mutate({ id: user.id, activo: !user.activo })
                      }
                    >
                      {user.activo ? (
                        <BlockIcon fontSize="small" />
                      ) : (
                        <CheckCircleIcon fontSize="small" />
                      )}
                    </IconButton>
                    <IconButton
                      size="small"
                      title="Resetear contraseña"
                      disabled={resetPasswordMutation.isPending}
                      onClick={() => resetPasswordMutation.mutate(user.id)}
                    >
                      <LockResetIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </Box>
        )}
      </Card>

      <UserFormDialog
        open={dialogOpen}
        user={editingUser}
        roles={roles}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      />

      <TemporaryPasswordDialog
        user={createdUser}
        title={passwordDialogTitle}
        onClose={() => setCreatedUser(null)}
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
