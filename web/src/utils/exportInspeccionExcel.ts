import * as XLSX from 'xlsx';
import type { InspectionDetail } from '../api/inspecciones';
import { ESTADO_LABEL, RESPUESTA_LABEL } from '../api/inspecciones';

const HEADER = [
  'Encargado',
  'Plantilla',
  'Centro',
  'Fecha',
  'Estado inspección',
  'Ítem',
  'Criticidad',
  'Respuesta',
  'Observación',
  'Evidencia',
  'Plan de acción',
  'Fecha de compromiso',
  'Fecha de control',
  'Responsable',
];

export function exportInspeccionExcel(inspection: InspectionDetail): void {
  const rows = inspection.answers.map((item) => [
    inspection.inspectorNombre,
    inspection.templateNombre,
    inspection.centroNombre,
    inspection.fecha,
    ESTADO_LABEL[inspection.estado],
    item.itemDescripcion,
    item.itemCriticidad === 'CRITICO' ? 'Crítico' : 'Básico',
    item.estado ? RESPUESTA_LABEL[item.estado] : '',
    item.observacion ?? '',
    item.evidenciaUrl ? 'Sí' : 'No',
    item.planAccion ?? '',
    item.fechaCompromiso ?? '',
    item.fechaControl ?? '',
    item.responsable ?? '',
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([HEADER, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Inspección');

  const filename = `inspeccion-${inspection.centroNombre}-${inspection.fecha}.xlsx`.replace(
    /[\\/:*?"<>|]/g,
    '_',
  );
  XLSX.writeFile(workbook, filename);
}
