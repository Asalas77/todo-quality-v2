import { ConflictException, NotFoundException } from '@nestjs/common';
import { ListChecklistTemplatesUseCase } from './list-checklist-templates.use-case';
import { GetChecklistTemplateUseCase } from './get-checklist-template.use-case';
import { CreateChecklistTemplateUseCase } from './create-checklist-template.use-case';
import { UpdateChecklistTemplateUseCase } from './update-checklist-template.use-case';
import { SetChecklistTemplateActivoUseCase } from './set-checklist-template-activo.use-case';
import {
  ChecklistTemplate,
  ChecklistTemplateInput,
  ChecklistTemplateNotFoundError,
  ChecklistTemplateRepositoryPort,
  ChecklistTemplateSummary,
  DuplicateIdentificadorError,
} from '../domain/ports/checklist-template-repository.port';

function buildTemplate(overrides: Partial<ChecklistTemplate> = {}): ChecklistTemplate {
  return {
    id: 'tpl-1',
    identificador: 'DOC SG-07',
    nombre: 'Higiene diaria',
    frecuencia: 'DIARIO',
    vigencia: '2026-01-01',
    activo: true,
    itemCount: 1,
    items: [{ id: 'item-1', descripcion: '¿Manos limpias?', criticidad: 'CRITICO', orden: 0 }],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function toSummary(t: ChecklistTemplate): ChecklistTemplateSummary {
  const { items: _items, ...summary } = t;
  return summary;
}

class FakeTemplateRepo implements ChecklistTemplateRepositoryPort {
  templates: ChecklistTemplate[] = [];
  throwOnCreate: Error | null = null;
  throwOnUpdate: Error | null = null;

  async findAll(includeInactive: boolean) {
    return this.templates.filter((t) => includeInactive || t.activo).map(toSummary);
  }

  async findById(id: string) {
    return this.templates.find((t) => t.id === id) ?? null;
  }

  async create(input: ChecklistTemplateInput) {
    if (this.throwOnCreate) throw this.throwOnCreate;
    const template = buildTemplate({
      id: `tpl-${this.templates.length + 1}`,
      ...input,
      items: input.items.map((item, index) => ({
        id: `item-${index}`,
        ...item,
        orden: index,
      })),
      itemCount: input.items.length,
    });
    this.templates.push(template);
    return template;
  }

  async update(id: string, input: ChecklistTemplateInput) {
    if (this.throwOnUpdate) throw this.throwOnUpdate;
    const template = this.templates.find((t) => t.id === id);
    if (!template) throw new ChecklistTemplateNotFoundError();
    Object.assign(template, {
      ...input,
      items: input.items.map((item, index) => ({ id: `item-${index}`, ...item, orden: index })),
      itemCount: input.items.length,
    });
    return template;
  }

  async setActivo(id: string, activo: boolean) {
    const template = this.templates.find((t) => t.id === id);
    if (!template) throw new ChecklistTemplateNotFoundError();
    template.activo = activo;
    return toSummary(template);
  }
}

const VALID_INPUT: ChecklistTemplateInput = {
  identificador: 'DOC SG-08',
  nombre: 'Higiene semanal',
  frecuencia: 'SEMANAL',
  vigencia: '2026-01-01',
  items: [{ descripcion: '¿Refrigerador limpio?', criticidad: 'BASICO' }],
};

describe('ListChecklistTemplatesUseCase', () => {
  it('excluye inactivas por defecto', async () => {
    const repo = new FakeTemplateRepo();
    repo.templates = [buildTemplate({ id: '1', activo: true }), buildTemplate({ id: '2', activo: false })];
    const useCase = new ListChecklistTemplatesUseCase(repo);

    expect(await useCase.execute({ includeInactive: false })).toHaveLength(1);
    expect(await useCase.execute({ includeInactive: true })).toHaveLength(2);
  });
});

describe('GetChecklistTemplateUseCase', () => {
  it('devuelve la plantilla con sus ítems', async () => {
    const repo = new FakeTemplateRepo();
    repo.templates = [buildTemplate()];
    const useCase = new GetChecklistTemplateUseCase(repo);

    const template = await useCase.execute('tpl-1');
    expect(template.items).toHaveLength(1);
  });

  it('traduce plantilla inexistente a 404', async () => {
    const repo = new FakeTemplateRepo();
    const useCase = new GetChecklistTemplateUseCase(repo);

    await expect(useCase.execute('no-existe')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('CreateChecklistTemplateUseCase', () => {
  it('crea la plantilla con sus ítems', async () => {
    const repo = new FakeTemplateRepo();
    const useCase = new CreateChecklistTemplateUseCase(repo);

    const template = await useCase.execute(VALID_INPUT);

    expect(template.items).toHaveLength(1);
    expect(template.identificador).toBe('DOC SG-08');
  });

  it('traduce identificador duplicado a 409', async () => {
    const repo = new FakeTemplateRepo();
    repo.throwOnCreate = new DuplicateIdentificadorError();
    const useCase = new CreateChecklistTemplateUseCase(repo);

    await expect(useCase.execute(VALID_INPUT)).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('UpdateChecklistTemplateUseCase', () => {
  it('reemplaza campos e ítems', async () => {
    const repo = new FakeTemplateRepo();
    repo.templates = [buildTemplate()];
    const useCase = new UpdateChecklistTemplateUseCase(repo);

    const updated = await useCase.execute({ id: 'tpl-1', ...VALID_INPUT });

    expect(updated.nombre).toBe('Higiene semanal');
    expect(updated.items).toHaveLength(1);
    expect(updated.items[0].descripcion).toBe('¿Refrigerador limpio?');
  });

  it('traduce plantilla inexistente a 404', async () => {
    const repo = new FakeTemplateRepo();
    const useCase = new UpdateChecklistTemplateUseCase(repo);

    await expect(
      useCase.execute({ id: 'no-existe', ...VALID_INPUT }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('traduce identificador duplicado a 409', async () => {
    const repo = new FakeTemplateRepo();
    repo.templates = [buildTemplate()];
    repo.throwOnUpdate = new DuplicateIdentificadorError();
    const useCase = new UpdateChecklistTemplateUseCase(repo);

    await expect(
      useCase.execute({ id: 'tpl-1', ...VALID_INPUT }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('SetChecklistTemplateActivoUseCase', () => {
  it('desactiva sin borrar', async () => {
    const repo = new FakeTemplateRepo();
    repo.templates = [buildTemplate({ activo: true })];
    const useCase = new SetChecklistTemplateActivoUseCase(repo);

    const result = await useCase.execute({ id: 'tpl-1', activo: false });

    expect(result.activo).toBe(false);
    expect(repo.templates).toHaveLength(1);
  });

  it('traduce plantilla inexistente a 404', async () => {
    const repo = new FakeTemplateRepo();
    const useCase = new SetChecklistTemplateActivoUseCase(repo);

    await expect(
      useCase.execute({ id: 'no-existe', activo: false }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
