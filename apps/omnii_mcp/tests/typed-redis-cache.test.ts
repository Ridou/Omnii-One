import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { setTyped, getTyped } from "../src/services/typed-redis-cache";
import { CachedEntity, CachedEntitySchema, EntityType } from "../src/types/entity.types";
import { redisCache } from "../src/services/redis-cache";

const cacheKey = "test:entity:person:eden";

// Clean up before and after
beforeAll(async () => {
  await redisCache.set(cacheKey, null);
});
afterAll(async () => {
  await redisCache.set(cacheKey, null);
});

describe("typed-redis-cache", () => {
  it("should store and retrieve a valid CachedEntity", async () => {
    const entity: CachedEntity = {
      type: EntityType.PERSON,
      value: "Eden",
      email: "edenchan717@gmail.com",
      resolvedAt: Date.now(),
    };
    await setTyped(cacheKey, entity, 60);
    const loaded = await getTyped(cacheKey, CachedEntitySchema);
    expect(loaded).not.toBeNull();
    expect(loaded?.type).toBe(EntityType.PERSON);
    expect(loaded?.email).toBe("edenchan717@gmail.com");
  });

  it("should return null for invalid schema", async () => {
    await redisCache.set(cacheKey, { type: "INVALID", value: 123, resolvedAt: "not-a-number" });
    const loaded = await getTyped(cacheKey, CachedEntitySchema);
    expect(loaded).toBeNull();
  });
}); 