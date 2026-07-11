import { Redis } from "ioredis";

const RATE_LIMIT_WINDOW_SEC = 1;

let redis: Redis | null = null;

function getMaxMessages(): number {
  return Number(process.env.MAX_MESSAGES_PER_SECOND ?? 50);
}

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (!redis) {
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    redis.on("error", (err: Error) => {
      console.error("[rate-limiter] Redis error:", err.message);
    });
  }

  return redis;
}

export async function checkRateLimit(
  userId: string,
  documentId: string
): Promise<boolean> {
  const client = getRedis();
  if (!client) {
    return false;
  }

  const key = `ratelimit:${userId}:${documentId}`;

  try {
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, RATE_LIMIT_WINDOW_SEC);
    }
    return count > getMaxMessages();
  } catch (err) {
    console.error("[rate-limiter] Redis unavailable, failing open:", err);
    return false;
  }
}

export { RATE_LIMIT_WINDOW_SEC, getMaxMessages };
