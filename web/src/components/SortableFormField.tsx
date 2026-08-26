import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, IconButton, Stack } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteIcon from '@mui/icons-material/Delete';

interface SortableFormFieldProps {
  id: string;
  onDelete: () => void;
  deleteDisabled: boolean;
  children: ReactNode;
}

/** Fila de campo arrastrable — el drag solo se activa desde el asa (icono), no desde toda la tarjeta. */
export function SortableFormField({ id, onDelete, deleteDisabled, children }: SortableFormFieldProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        p: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <IconButton
          size="small"
          sx={{ mt: 0.5, cursor: 'grab', touchAction: 'none' }}
          {...attributes}
          {...listeners}
          aria-label="Arrastrar para reordenar"
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>{children}</Box>
        <IconButton size="small" onClick={onDelete} disabled={deleteDisabled} sx={{ mt: 0.5 }}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
}
