// src/middleware/error.ts
import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { HonoContext } from '../types/index.js';
import { response } from '../utils/response.js'; // Updated import

export async function errorHandler(c: Context<HonoContext>, next: Next) {
  try {
    await next();
  } catch (error) {
    const isProd = process.env.NODE_ENV === 'production';
    const status = error instanceof HTTPException ? error.status : 500;
    const message = error instanceof Error 
      ? (isProd && status === 500 ? 'Internal Server Error' : error.message)
      : 'An unknown error occurred';
      
    return c.json(response.error(message), status); // Updated call
  }
}