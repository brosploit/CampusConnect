import { env } from '../config/env';
import { IRepository } from './repository';
import { MemoryRepository } from './memoryDb';
import { PgRepository } from './pgRepository';

let repositoryInstance: IRepository;

export function getRepository(): IRepository {
  if (!repositoryInstance) {
    if (env.NODE_ENV === 'test' || env.USE_MEMORY_DB) {
      repositoryInstance = new MemoryRepository();
    } else {
      // In production or development, use PgRepository by default,
      // but fallback to MemoryRepository if DB is not configured or in memory test mode
      repositoryInstance = new PgRepository();
    }
  }
  return repositoryInstance;
}

export function setRepository(repo: IRepository) {
  repositoryInstance = repo;
}
