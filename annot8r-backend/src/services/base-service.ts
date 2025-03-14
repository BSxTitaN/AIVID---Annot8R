// src/services/base-service.ts
import {
  ObjectId,
  Collection,
  type Filter,
  type FindOptions,
  type Document,
} from "mongodb";
import { db } from "../config/index.js";

export class BaseService<T extends { _id?: ObjectId }> {
  protected collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  /**
   * Get database collection
   */
  protected collection(): Collection<T> {
    return db.getDb().collection<T>(this.collectionName);
  }

  /**
   * Find document by ID
   */
  async findById(id: string): Promise<T | null> {
    return this.collection().findOne({
      _id: new ObjectId(id),
    } as Filter<T>) as Promise<T | null>;
  }

  /**
   * Find document by custom query
   */
  async findOne(query: Filter<T>): Promise<T | null> {
    return this.collection().findOne(query) as Promise<T | null>;
  }

  /**
   * Find multiple documents
   */
  async find(
    query: Filter<T> = {} as Filter<T>,
    options: {
      sort?: Record<string, 1 | -1>;
      skip?: number;
      limit?: number;
    } = {}
  ): Promise<{ items: T[]; total: number }> {
    const { sort, skip, limit } = options;

    const cursor = this.collection().find(query);

    if (sort) cursor.sort(sort);
    if (skip !== undefined) cursor.skip(skip);
    if (limit !== undefined) cursor.limit(limit);

    const [items, total] = await Promise.all([
      cursor.toArray() as Promise<T[]>,
      this.collection().countDocuments(query),
    ]);

    return { items, total };
  }

  /**
   * Create a new document
   */
  async create(data: Omit<T, "_id">): Promise<T> {
    const result = await this.collection().insertOne(data as any);
    return { ...data, _id: result.insertedId } as T;
  }

  /**
   * Update a document
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    return this.collection().findOneAndUpdate(
      { _id: new ObjectId(id) } as Filter<T>,
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: "after" }
    ) as Promise<T | null>;
  }

  /**
   * Delete a document
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.collection().deleteOne({
      _id: new ObjectId(id),
    } as Filter<T>);
    return result.deletedCount > 0;
  }

  /**
   * Count documents matching a query
   */
  async count(query: Filter<T> = {} as Filter<T>): Promise<number> {
    return this.collection().countDocuments(query);
  }

  /**
   * Get paginated results
   */
  async paginate(
    query: Filter<T> = {} as Filter<T>,
    page: number = 1,
    limit: number = 20,
    sort: Record<string, 1 | -1> = { _id: -1 }
  ): Promise<{ items: T[]; total: number }> {
    const skip = (page - 1) * limit;
    return this.find(query, { sort, skip, limit });
  }

  /**
   * Create a properly typed filter for _id queries
   */
  protected createIdFilter(id: string | ObjectId): Filter<T> {
    return { _id: new ObjectId(id.toString()) } as unknown as Filter<T>;
  }

  /**
   * Create a properly typed filter for multiple ids
   */
  protected createIdsFilter(ids: Array<string | ObjectId>): Filter<T> {
    const objectIds = ids.map((id) => new ObjectId(id.toString()));
    return { _id: { $in: objectIds } } as unknown as Filter<T>;
  }
}
