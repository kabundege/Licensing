import type { DataSource, EntityManager } from 'typeorm';


export const runInTransaction = async <T>(
  dataSource: DataSource,
  work: (manager: EntityManager) => Promise<T>
): Promise<T> => {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    const result = await work(queryRunner.manager);
    await queryRunner.commitTransaction();
    return result;
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
};
