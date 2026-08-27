import { useMemo, useState } from 'react';
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
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import EditNoteIcon from '@mui/icons-material/EditNote';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DescriptionIcon from '@mui/icons-material/Description';
import { AxiosError } from 'axios';
import { MainLayout } from '../components/MainLayout';
import { PageLoader } from '../components/PageLoader';
import { PlantillaFormDialog } from '../components/PlantillaFormDialog';
import { FormBuilderDialog } from '../components/FormBuilderDialog';
import { FormBuilderDialogV2 } from '../components/FormBuilderDialogV2';
import { plantillasApi, FRECUENCIA_LABEL } from '../api/plantillas';
import type { ChecklistTemplateDetail, ChecklistTemplateInput } from '../api/plantillas';
import { formulariosApi } from '../api/formularios';
import type { FormDetail, FormInput } from '../api/formularios';
import { useAuth } from '../context/AuthContext';

/**
 * Fila unificada: checklists y formularios se listan juntos. Los campos que no aplican a
 * un tipo quedan en null (un formulario no tiene frecuencia ni identificador).
 */
interface UnifiedRow {
  id: string;
  tipo: 'CHECKLIST' | 'FORMULARIO';
  nombre: string;
  identificador: string | null;
  frecuencia: string | null;
  elementos: number;
  activo: boolean;
}

export function PlantillasPage() {
  const { hasPermission } = useAuth();
  const canManageChecklists = hasPermission('plantillas.gestionar');
  const canManageForms = hasPermission('formularios.gestionar');
  const canCompleteForms = hasPermission('formularios.completar');
  const canViewForms = hasPermission('formularios.ver');
  const queryClient = useQueryClient();

  const [includeInactive, setIncludeInactive] = useState(false);
  const [search, setSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplateDetail | null>(null);

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [builderVersion, setBuilderVersion] = useState<1 | 2>(2);
  const [editingForm, setEditingForm] = useState<FormDetail | null>(null);

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['plantillas', includeInactive],
    queryFn: () => plantillasApi.list(includeInactive),
  });

  const { data: forms = [], isLoading: loadingForms } = useQuery({
    queryKey: ['formularios', includeInactive],
    queryFn: () => formulariosApi.list(includeInactive),
    enabled: canViewForms,
  });

  const invalidateTemplates = () =>
    queryClient.invalidateQueries({ queryKey: ['plantillas'] });
  const invalidateForms = () => queryClient.invalidateQueries({ queryKey: ['formularios'] });

  const createTemplateMutation = useMutation({
    mutationFn: (input: ChecklistTemplateInput) => plantillasApi.create(input),
    onSuccess: () => {
      invalidateTemplates();
      setChecklistDialogOpen(false);
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (input: ChecklistTemplateInput) =>
      plantillasApi.update(editingTemplate!.id, input),
    onSuccess: () => {
      invalidateTemplates();
      setChecklistDialogOpen(false);
    },
  });

  const toggleTemplateActivoMutation = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      plantillasApi.setActivo(id, activo),
    onSuccess: invalidateTemplates,
    onError: (error) => setErrorMessage(describeError(error)),
  });

  const createFormMutation = useMutation({
    mutationFn: (input: FormInput) => formulariosApi.create(input),
    onSuccess: () => {
      invalidateForms();
      setFormDialogOpen(false);
    },
  });

  const updateFormMutation = useMutation({
    mutationFn: (input: FormInput) => formulariosApi.update(editingForm!.id, input),
    onSuccess: () => {
      invalidateForms();
      setFormDialogOpen(false);
    },
  });

  const toggleFormActivoMutation = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      formulariosApi.setActivo(id, activo),
    onSuccess: invalidateForms,
    onError: (error) => setErrorMessage(describeError(error)),
  });

  const rows = useMemo<UnifiedRow[]>(() => {
    const checklistRows: UnifiedRow[] = templates.map((t) => ({
      id: t.id,
      tipo: 'CHECKLIST',
      nombre: t.nombre,
      identificador: t.identificador,
      frecuencia: FRECUENCIA_LABEL[t.frecuencia],
      elementos: t.itemCount,
      activo: t.activo,
    }));
    const formRows: UnifiedRow[] = forms.map((f) => ({
      id: f.id,
      tipo: 'FORMULARIO',
      nombre: f.nombre,
      identificador: f.identificador,
      frecuencia: FRECUENCIA_LABEL[f.frecuencia],
      elementos: f.fieldCount,
      activo: f.activo,
    }));
    return [...checklistRows, ...formRows].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [templates, forms]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.nombre.toLowerCase().includes(term) ||
        (r.identificador ?? '').toLowerCase().includes(term),
    );
  }, [rows, search]);

  const openCreateChecklist = () => {
    setEditingTemplate(null);
    setChecklistDialogOpen(true);
  };

  const openEditChecklist = async (id: string) => {
    try {
      setEditingTemplate(await plantillasApi.get(id));
      setChecklistDialogOpen(true);
    } catch (error) {
      setErrorMessage(describeError(error));
    }
  };

  const openCreateForm = (version: 1 | 2) => {
    setBuilderVersion(version);
    setEditingForm(null);
    setFormDialogOpen(true);
  };

  const openEditForm = async (id: string, version: 1 | 2) => {
    try {
      setEditingForm(await formulariosApi.get(id));
      setBuilderVersion(version);
      setFormDialogOpen(true);
    } catch (error) {
      setErrorMessage(describeError(error));
    }
  };

  const handleChecklistSubmit = async (values: ChecklistTemplateInput) => {
    try {
      if (editingTemplate) await updateTemplateMutation.mutateAsync(values);
      else await createTemplateMutation.mutateAsync(values);
    } catch (error) {
      setErrorMessage(describeError(error));
    }
  };

  const handleFormSubmit = async (values: FormInput) => {
    try {
      if (editingForm) await updateFormMutation.mutateAsync(values);
      else await createFormMutation.mutateAsync(values);
    } catch (error) {
      setErrorMessage(describeError(error));
    }
  };

  const isLoading = loadingTemplates || (canViewForms && loadingForms);

  return (
    <MainLayout>
      <Card sx={{ p: 3 }}>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}
        >
          <Typography variant="h5">Plantillas</Typography>
          <Stack direction="row" spacing={1}>
            {canManageChecklists && (
              <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreateChecklist}>
                Nuevo checklist
              </Button>
            )}
            {canManageForms && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => openCreateForm(2)}>
                Nuevo formulario
              </Button>
            )}
          </Stack>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label="Buscar por nombre o identificador"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 280, flex: '1 1 280px' }}
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

        {isLoading ? (
          <PageLoader />
        ) : (
        <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Tipo</TableCell>
              <TableCell>Identificador</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Frecuencia</TableCell>
              <TableCell align="center">Ítems / Campos</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No hay plantillas para mostrar.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {filtered.map((row) => {
              const esChecklist = row.tipo === 'CHECKLIST';
              return (
                <TableRow key={`${row.tipo}-${row.id}`} hover>
                  <TableCell>
                    <Chip
                      size="small"
                      icon={esChecklist ? <AssignmentIcon /> : <DescriptionIcon />}
                      label={esChecklist ? 'Checklist' : 'Formulario'}
                      color={esChecklist ? 'primary' : 'secondary'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{row.identificador ?? '—'}</TableCell>
                  <TableCell>{row.nombre}</TableCell>
                  <TableCell>{row.frecuencia ?? '—'}</TableCell>
                  <TableCell align="center">{row.elementos}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.activo ? 'Activa' : 'Inactiva'}
                      color={row.activo ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {esChecklist ? (
                      canManageChecklists && (
                        <>
                          <IconButton
                            size="small"
                            title="Editar checklist"
                            onClick={() => openEditChecklist(row.id)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            title={row.activo ? 'Desactivar' : 'Reactivar'}
                            onClick={() =>
                              toggleTemplateActivoMutation.mutate({
                                id: row.id,
                                activo: !row.activo,
                              })
                            }
                          >
                            {row.activo ? (
                              <BlockIcon fontSize="small" />
                            ) : (
                              <CheckCircleIcon fontSize="small" />
                            )}
                          </IconButton>
                        </>
                      )
                    ) : (
                      <>
                        {canCompleteForms && row.activo && (
                          <IconButton
                            size="small"
                            title="Completar formulario"
                            component={RouterLink}
                            to={`/formularios/${row.id}/completar`}
                          >
                            <PlaylistAddCheckIcon fontSize="small" />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          title="Ver respuestas"
                          component={RouterLink}
                          to={`/formularios/${row.id}/respuestas`}
                        >
                          <ListAltIcon fontSize="small" />
                        </IconButton>
                        {canManageForms && (
                          <>
                            <IconButton
                              size="small"
                              title="Editar (builder clásico)"
                              onClick={() => openEditForm(row.id, 1)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="primary"
                              title="Editar (builder v2)"
                              onClick={() => openEditForm(row.id, 2)}
                            >
                              <EditNoteIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              title={row.activo ? 'Desactivar' : 'Reactivar'}
                              onClick={() =>
                                toggleFormActivoMutation.mutate({
                                  id: row.id,
                                  activo: !row.activo,
                                })
                              }
                            >
                              {row.activo ? (
                                <BlockIcon fontSize="small" />
                              ) : (
                                <CheckCircleIcon fontSize="small" />
                              )}
                            </IconButton>
                          </>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </Box>
        )}
      </Card>

      <PlantillaFormDialog
        open={checklistDialogOpen}
        template={editingTemplate}
        onClose={() => setChecklistDialogOpen(false)}
        onSubmit={handleChecklistSubmit}
      />

      {builderVersion === 1 ? (
        <FormBuilderDialog
          open={formDialogOpen}
          form={editingForm}
          onClose={() => setFormDialogOpen(false)}
          onSubmit={handleFormSubmit}
        />
      ) : (
        <FormBuilderDialogV2
          open={formDialogOpen}
          form={editingForm}
          onClose={() => setFormDialogOpen(false)}
          onSubmit={handleFormSubmit}
        />
      )}

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
