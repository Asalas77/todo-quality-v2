/**
 * manager.query() de TypeORM devuelve las filas directamente para INSERT/SELECT, pero
 * [filas, contadorDeFilas] para UPDATE/DELETE. Sin destructurar esa tupla, `resultado[0]`
 * de un UPDATE es el array de filas completo — siempre "truthy", así que un update a un
 * id inexistente (0 filas afectadas) nunca se detecta como "no encontrado".
 *
 * Usar SIEMPRE que se lea el resultado de un UPDATE/DELETE ... RETURNING vía manager.query().
 */
export function rowsFromUpdate<T>(result: unknown): T[] {
  return (result as [T[], number])[0];
}
