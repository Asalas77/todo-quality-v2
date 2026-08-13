export const EVIDENCE_STORAGE = Symbol('EVIDENCE_STORAGE');

export interface StoredEvidence {
  /** Ruta de lectura en disco; el controlador la transmite con un stream. */
  path: string;
  mimeType: string;
}

export interface EvidenceStoragePort {
  /** Guarda el archivo y devuelve una clave opaca (no es una URL pública). */
  save(tenantId: string, buffer: Buffer, extension: string): Promise<string>;
  /** Lanza EvidenceNotFoundError si la clave no corresponde a un archivo existente. */
  read(storageKey: string): Promise<StoredEvidence>;
  /** No falla si el archivo ya no existe — borrar algo ausente no es un error aquí. */
  delete(storageKey: string): Promise<void>;
}

export class EvidenceNotFoundError extends Error {
  constructor() {
    super('El archivo de evidencia no existe');
  }
}
