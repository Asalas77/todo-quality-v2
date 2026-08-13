import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

/**
 * Igual que DiskEvidenceStorage (módulo inspecciones), pero para archivos adjuntos de
 * respuestas de formulario — no comparten puerto porque los dominios son distintos, pero
 * la implementación en disco es prácticamente idéntica a propósito (mismo criterio de
 * ubicación y resolución segura de rutas).
 */
@Injectable()
export class FormFileStorage {
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = path.resolve(config.get('UPLOADS_DIR', './uploads'));
  }

  async save(tenantId: string, buffer: Buffer, mimeType: string): Promise<string> {
    const extension = EXTENSION_BY_MIME[mimeType];
    if (!extension) {
      throw new NotFoundException('Formato de archivo no admitido');
    }
    const dir = path.join(this.root, tenantId, 'formularios');
    await mkdir(dir, { recursive: true });

    const filename = `${randomUUID()}${extension}`;
    const storageKey = path.posix.join(tenantId, 'formularios', filename);
    await writeFile(path.join(dir, filename), buffer);
    return storageKey;
  }

  async resolve(storageKey: string): Promise<{ path: string; mimeType: string }> {
    const resolved = path.resolve(this.root, storageKey);
    if (!resolved.startsWith(this.root + path.sep)) {
      throw new NotFoundException('Archivo no encontrado');
    }
    try {
      await stat(resolved);
    } catch {
      throw new NotFoundException('Archivo no encontrado');
    }
    const mimeType = MIME_BY_EXTENSION[path.extname(resolved).toLowerCase()] ?? 'application/octet-stream';
    return { path: resolved, mimeType };
  }
}
