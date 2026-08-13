import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import {
  EvidenceNotFoundError,
  EvidenceStoragePort,
  StoredEvidence,
} from '../domain/ports/evidence-storage.port';

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
};

@Injectable()
export class DiskEvidenceStorage implements EvidenceStoragePort {
  private readonly root: string;

  constructor(config: ConfigService) {
    // Ruta absoluta: si UPLOADS_DIR es relativa, queda anclada al directorio de trabajo
    // del proceso en vez de a este archivo fuente (relevante porque el código compilado
    // corre desde dist/, no desde src/).
    this.root = path.resolve(config.get('UPLOADS_DIR', './uploads'));
  }

  async save(tenantId: string, buffer: Buffer, extension: string): Promise<string> {
    const dir = path.join(this.root, tenantId);
    await mkdir(dir, { recursive: true });

    const filename = `${randomUUID()}${extension}`;
    const storageKey = path.posix.join(tenantId, filename);
    await writeFile(path.join(dir, filename), buffer);
    return storageKey;
  }

  async read(storageKey: string): Promise<StoredEvidence> {
    const filePath = this.resolveWithinRoot(storageKey);

    try {
      await stat(filePath);
    } catch {
      throw new EvidenceNotFoundError();
    }

    const mimeType = MIME_BY_EXTENSION[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
    return { path: filePath, mimeType };
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await rm(this.resolveWithinRoot(storageKey));
    } catch {
      // Ya no existe: borrar algo ausente no es un error para este puerto.
    }
  }

  /**
   * storageKey lo genera siempre este servicio (nunca llega directo de un cliente), pero
   * se resuelve de forma defensiva de todas formas: si algún día algo la pasa desde
   * fuera, un ".." no debe poder escapar del directorio de subidas.
   */
  private resolveWithinRoot(storageKey: string): string {
    const resolved = path.resolve(this.root, storageKey);
    if (!resolved.startsWith(this.root + path.sep)) {
      throw new EvidenceNotFoundError();
    }
    return resolved;
  }
}
