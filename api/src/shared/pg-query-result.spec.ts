import { rowsFromUpdate } from './pg-query-result';

/**
 * Regresión: TypeORM's manager.query() sin useStructuredResult devuelve las filas
 * directamente para INSERT/SELECT, pero [filas, contadorDeFilas] para UPDATE/DELETE.
 * Sin destructurar esa tupla, `resultado[0]` de un UPDATE es el array de filas completo
 * (siempre truthy) en vez de la primera fila — un update a un id inexistente nunca se
 * detectaba como "no encontrado" y un update exitoso devolvía un objeto vacío.
 */
describe('rowsFromUpdate', () => {
  it('extrae las filas de la tupla [filas, contador] que devuelve un UPDATE', () => {
    const driverResult: [Array<{ id: string }>, number] = [[{ id: 'centro-1' }], 1];

    expect(rowsFromUpdate<{ id: string }>(driverResult)).toEqual([{ id: 'centro-1' }]);
  });

  it('un UPDATE que no afectó filas se detecta como vacío, no como truthy', () => {
    const driverResult: [Array<{ id: string }>, number] = [[], 0];

    const rows = rowsFromUpdate<{ id: string }>(driverResult);
    expect(rows[0]).toBeUndefined();
  });
});
