import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession, { SessionStore } from '@fastify/session';
import fastifyRedis from '@fastify/redis';
import fastifyMultipart from '@fastify/multipart';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { RedisService } from './shared/infrastructure/services/redis.service';
import { ConfigService } from '@nestjs/config';
import { SessionIoAdapter } from './contexts/messaging/infrastructure/io/session-io.adapter';

interface RedisClient {
  set(
    key: string,
    value: string,
    mode: string,
    duration: number,
  ): Promise<void>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<void>;
}

function getFastifyRedis(app: NestFastifyApplication): RedisClient {
  return (
    app.getHttpAdapter().getInstance() as unknown as { redis: RedisClient }
  ).redis;
}

type MultipartPart = {
  toBuffer(): Promise<Buffer>;
  filename: string;
  mimetype: string;
  value?: unknown;
};

class RedisSessionStore implements SessionStore {
  constructor(
    private readonly redis: RedisClient,
    private readonly ttlSeconds: number,
  ) {}

  set(sessionId: string, session: unknown, cb: (err?: Error) => void): void {
    const payload = JSON.stringify(session);
    this.redis
      .set(this.key(sessionId), payload, 'EX', this.ttlSeconds)
      .then(() => cb())
      .catch((err: Error) => cb(err));
  }

  get(sessionId: string, cb: (err: Error | null, session?: any) => void): void {
    this.redis
      .get(this.key(sessionId))
      .then((raw) => cb(null, raw ? (JSON.parse(raw) as object) : null))
      .catch((err: Error) => cb(err));
  }

  destroy(sessionId: string, cb: (err?: Error) => void): void {
    this.redis
      .del(this.key(sessionId))
      .then(() => cb())
      .catch((err: Error) => cb(err));
  }

  private key(sessionId: string): string {
    return `sess:${sessionId}`;
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      logger: ['log', 'error', 'warn', 'debug'],
      cors: {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
        exposedHeaders: ['Set-Cookie'],
      },
    },
  );

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 3000;
  const sessionSecret = config.get<string>('SESSION_SECRET');

  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error(
      'SESSION_SECRET must be set and at least 32 characters long',
    );
  }

  await app.register(
    fastifyRedis as unknown as Parameters<typeof app.register>[0],
    { client: RedisService.createWriteClient() },
  );

  const cookieDomain = config.get<string>('SESSION_COOKIE_DOMAIN') || undefined;
  const secureCookie =
    (config.get<string>('SESSION_COOKIE_SECURE') || 'false') === 'true';
  const sessionTtl =
    config.get<number>('SESSION_TTL_SECONDS') ?? 60 * 60 * 24 * 7; // 7 days default
  const cookieName = config.get<string>('SESSION_COOKIE_NAME') || 'sid';

  await app.register(
    fastifyCookie as unknown as Parameters<typeof app.register>[0],
    {
      secret: sessionSecret,
      parseOptions: {
        httpOnly: true,
        sameSite: 'lax',
        secure: secureCookie,
        domain: cookieDomain,
      },
    },
  );

  await app.register(
    fastifySession as unknown as Parameters<typeof app.register>[0],
    {
      secret: sessionSecret,
      cookieName,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: secureCookie,
        domain: cookieDomain,
        maxAge: sessionTtl * 1000,
      },
      store: new RedisSessionStore(getFastifyRedis(app), sessionTtl),
    },
  );

  await app.register(
    fastifyMultipart as unknown as Parameters<typeof app.register>[0],
    {
      attachFieldsToBody: 'keyValues',
      async onFile(part: MultipartPart) {
        const buffer = await part.toBuffer();
        part.value = {
          toBuffer: () => Promise.resolve(buffer),
          filename: part.filename,
          mimetype: part.mimetype,
        };
      },
      limits: {
        fileSize: 500 * 1024 * 1024, // 500 MB
        files: 11, // 1 logo + up to 10 gallery images
      },
    },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
    }),
  );

  app.useWebSocketAdapter(
    new SessionIoAdapter(app, {
      sessionSecret,
      cookieName,
      redis: getFastifyRedis(app),
    }),
  );

  const apiPrefix = config.get<string>('API_PREFIX');
  if (apiPrefix) {
    app.setGlobalPrefix(apiPrefix);
  }

  await app.listen(port, '0.0.0.0');
}
void bootstrap();
