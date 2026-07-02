import { Signer } from '@fastify/cookie';

export interface TestSessionUser {
  id: number;
  _id: string;
  email: string;
  role: string;
  verifiedAt: string | null;
}

export function signSessionId(secret: string, sessionId: string): string {
  const signer = new Signer(secret, 'sha256');
  return signer.sign(sessionId);
}

export function buildCookieHeader(
  cookieName: string,
  signedValue: string,
): string {
  return `${cookieName}=${encodeURIComponent(signedValue)}`;
}

interface RedisLike {
  set(
    key: string,
    value: string,
    mode: string,
    duration: number,
  ): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

export async function seedSession(
  redis: RedisLike,
  sessionId: string,
  user: TestSessionUser,
  ttlSeconds: number,
): Promise<void> {
  const expires = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const payload = {
    cookie: {
      originalMaxAge: ttlSeconds * 1000,
      expires,
      secure: false,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    },
    user,
  };
  await redis.set(
    `sess:${sessionId}`,
    JSON.stringify(payload),
    'EX',
    ttlSeconds,
  );
}

export async function destroySession(
  redis: RedisLike,
  sessionId: string,
): Promise<void> {
  await redis.del(`sess:${sessionId}`);
}
