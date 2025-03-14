// src/routes/route-factory.ts
import { Hono, type Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ObjectId } from "mongodb";
import type { HonoContext } from "../types/index.js";
import { z } from "zod";
import { response } from "../utils/response.js";
import { validation } from "../utils/validation.js";
import { authenticate, requireRoles } from "../middleware/index.js";
import { BaseService } from "../services/base-service.js";
import { UserRole } from "../types/index.js";

/**
 * Create standard GET by ID route
 */
export function createGetByIdRoute<T extends { _id: ObjectId }>(
  router: Hono<HonoContext>,
  path: string,
  service: BaseService<T>,
  options: {
    roles?: UserRole[];
    formatResponse?: (item: T) => Record<string, any>;
  } = {}
) {
  const handlers = options.roles
    ? [authenticate, requireRoles(options.roles)]
    : [authenticate];

  router.get(path, ...handlers, async (c) => {
    const id = c.req.param("id");
    if (!id) {
      throw new HTTPException(400, { message: "ID parameter is required" });
    }

    validation.objectId(id);

    const item = await service.findById(id);
    if (!item) {
      throw new HTTPException(404, { message: "Not found" });
    }

    const data = options.formatResponse ? options.formatResponse(item) : item;
    return c.json(response.success(data));
  });
}

/**
 * Create standard list route with pagination
 */
export function createListRoute<T extends { _id: ObjectId }>(
  router: Hono<HonoContext>,
  path: string,
  service: BaseService<T>,
  options: {
    roles?: UserRole[];
    getFilter?: (c: Context<HonoContext>) => Record<string, any>;
    formatResponse?: (items: T[]) => Record<string, any>[];
    itemsKey?: string;
  } = {}
) {
  const handlers = options.roles
    ? [authenticate, requireRoles(options.roles)]
    : [authenticate];

  router.get(path, ...handlers, async (c) => {
    const page = Number(c.req.query("page") || "1");
    const limit = Number(c.req.query("limit") || "20");

    const filter = options.getFilter ? options.getFilter(c) : {};
    const { items, total } = await service.paginate(filter, page, limit);

    const formattedItems = options.formatResponse
      ? options.formatResponse(items)
      : items;
    const result = {
      [options.itemsKey || "items"]: formattedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return c.json(response.success(result));
  });
}

/**
 * Create standard create route
 */
export function createCreateRoute<T extends { _id: ObjectId }, D>(
  router: Hono<HonoContext>,
  path: string,
  service: BaseService<T>,
  options: {
    roles?: UserRole[];
    schema: z.ZodType<D>;
    processData: (data: D, c: Context<HonoContext>) => Promise<Omit<T, "_id">>;
    formatResponse?: (item: T) => Record<string, any>;
    successMessage?: string;
  }
) {
  const handlers = options.roles
    ? [authenticate, requireRoles(options.roles)]
    : [authenticate];

  router.post(path, ...handlers, async (c) => {
    const body = await c.req.json<D>();
    validation.schema(options.schema, body);

    const data = await options.processData(body, c);
    const result = await service.create(data);

    const formattedResult = options.formatResponse
      ? options.formatResponse(result)
      : result;
    return c.json(
      response.success(formattedResult, options.successMessage),
      201
    );
  });
}

/**
 * Create standard update route
 */
export function createUpdateRoute<T extends { _id: ObjectId }, D>(
  router: Hono<HonoContext>,
  path: string,
  service: BaseService<T>,
  options: {
    roles?: UserRole[];
    schema: z.ZodType<D>;
    processData?: (data: D, c: Context<HonoContext>) => Promise<Partial<T>>;
    formatResponse?: (item: T) => Record<string, any>;
    successMessage?: string;
  }
) {
  const handlers = options.roles
    ? [authenticate, requireRoles(options.roles)]
    : [authenticate];

  router.patch(path, ...handlers, async (c) => {
    const id = c.req.param("id");
    if (!id) {
      throw new HTTPException(400, { message: "ID parameter is required" });
    }

    validation.objectId(id);

    const body = await c.req.json<D>();
    validation.schema(options.schema, body);

    const data = options.processData
      ? await options.processData(body, c)
      : (body as unknown as Partial<T>);
    const result = await service.update(id, data);

    if (!result) {
      throw new HTTPException(404, { message: "Not found" });
    }

    const formattedResult = options.formatResponse
      ? options.formatResponse(result)
      : result;
    return c.json(response.success(formattedResult, options.successMessage));
  });
}

/**
 * Create standard delete route
 */
export function createDeleteRoute<T extends { _id: ObjectId }>(
  router: Hono<HonoContext>,
  path: string,
  service: BaseService<T>,
  options: {
    roles?: UserRole[];
    successMessage?: string;
    preDelete?: (id: string, c: Context<HonoContext>) => Promise<void>;
    postDelete?: (id: string, c: Context<HonoContext>) => Promise<void>;
  } = {}
) {
  const handlers = options.roles
    ? [authenticate, requireRoles(options.roles)]
    : [authenticate];

  router.delete(path, ...handlers, async (c) => {
    const id = c.req.param("id");
    if (!id) {
      throw new HTTPException(400, { message: "ID parameter is required" });
    }

    validation.objectId(id);

    if (options.preDelete) {
      await options.preDelete(id, c);
    }

    const success = await service.delete(id);
    if (!success) {
      throw new HTTPException(404, { message: "Not found" });
    }

    if (options.postDelete) {
      await options.postDelete(id, c);
    }

    return c.json(
      response.success(null, options.successMessage || "Deleted successfully")
    );
  });
}
