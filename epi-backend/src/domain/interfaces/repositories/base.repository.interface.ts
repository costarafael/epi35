export interface IBaseRepository<TEntity, TId = string> {
  findById(id: TId): Promise<TEntity | null>;
  findAll(): Promise<TEntity[]>;
  create(entity: Omit<TEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<TEntity>;
  update(id: TId, entity: Partial<TEntity>): Promise<TEntity>;
  delete(id: TId): Promise<void>;
}