import { redisCache } from "./redis-cache";
import { ZodSchema } from "zod/v4";

export async function setTyped<T>(key: string, value: T, ttl?: number) {
  await redisCache.set(key, value, ttl);
}

export async function getTyped<T>(
  key: string,
  schema: ZodSchema<T>
): Promise<T | null> {
  const value = await redisCache.get(key);
  if (!value) return null;
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  // Optionally log or throw on schema mismatch
  console.warn(`[typed-redis-cache] Schema validation failed for key ${key}`);
  return null;
}

export async function deleteTyped(key: string): Promise<void> {
  await redisCache.del(key);
}
