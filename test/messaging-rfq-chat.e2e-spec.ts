import { randomUUID } from 'crypto';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession, { type SessionStore } from '@fastify/session';
import fastifyRedis from '@fastify/redis';
import fastifyMultipart from '@fastify/multipart';
import { getDataSourceToken } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import request from 'supertest';
import { io as ioClient, type Socket } from 'socket.io-client';

import { AppModule } from '../src/app.module';
import { SessionIoAdapter } from '../src/contexts/messaging/infrastructure/io/session-io.adapter';
import { UserOrmEntity } from '../src/contexts/auth/infrastructure/persistence/user.orm-entity';
import { UserRole } from '../src/contexts/auth/domain/enums/user-role.enum';
import { SupplierOrmEntity } from '../src/contexts/supplier/identity/infrastructure/persistence/supplier.orm-entity';
import { SupplierVerificationStatus } from '../src/contexts/supplier/identity/domain/enums/supplier-verification-status.enum';
import { RfqOrmEntity } from '../src/contexts/rfq/infrastructure/persistence/rfq.orm-entity';
import { RfqStatus, RfqType } from '../src/contexts/rfq/domain/rfq.types';
import { ConversationOrmEntity } from '../src/contexts/messaging/infrastructure/persistence/conversation.orm-entity';

import {
  buildCookieHeader,
  destroySession,
  seedSession,
  signSessionId,
  type TestSessionUser,
} from './helpers/session';

interface RedisClient {
  set(
    key: string,
    value: string,
    mode: string,
    duration: number,
  ): Promise<unknown>;
  get(key: string): Promise<string | null>;
  del(key: string | string[]): Promise<unknown>;
}

class RedisSessionStore implements SessionStore {
  constructor(
    private readonly redis: RedisClient,
    private readonly ttlSeconds: number,
  ) {}
  set(sessionId: string, session: unknown, cb: (err?: Error) => void): void {
    this.redis
      .set(`sess:${sessionId}`, JSON.stringify(session), 'EX', this.ttlSeconds)
      .then(() => cb())
      .catch((err: Error) => cb(err));
  }
  get(
    sessionId: string,
    cb: (err: Error | null, session?: unknown) => void,
  ): void {
    this.redis
      .get(`sess:${sessionId}`)
      .then((raw) => cb(null, raw ? (JSON.parse(raw) as object) : null))
      .catch((err: Error) => cb(err));
  }
  destroy(sessionId: string, cb: (err?: Error) => void): void {
    this.redis
      .del(`sess:${sessionId}`)
      .then(() => cb())
      .catch((err: Error) => cb(err));
  }
}

const SESSION_SECRET =
  process.env.SESSION_SECRET || 'e2e-test-session-secret-32-chars-min';
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'sid';
const SESSION_TTL = 60 * 60; // 1h is plenty for tests

interface SeededUser {
  id: number;
  _id: string;
  email: string;
  role: UserRole;
  sessionId: string;
  cookieHeader: string;
}

interface SeededSupplier {
  id: number;
  _id: string;
  userId: number;
}

describe('Messaging + RFQ chat (e2e)', () => {
  let app: NestFastifyApplication;
  let baseUrl: string;
  let dataSource: DataSource;
  let redis: RedisClient;

  let buyer1: SeededUser;
  let buyer2: SeededUser;
  let supplierUser1: SeededUser;
  let supplierUser2: SeededUser;
  let outsider: SeededUser;
  let supplier1: SeededSupplier;
  let supplier2: SeededSupplier;
  let directedRfqId: string;
  let directedRfqInternalId: number;

  const runPrefix = `e2e-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  beforeAll(async () => {
    process.env.SESSION_SECRET = SESSION_SECRET;
    process.env.SESSION_COOKIE_NAME = COOKIE_NAME;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    await app.register(
      fastifyRedis as unknown as Parameters<typeof app.register>[0],
      {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        db: Number(process.env.REDIS_DB || 0),
        family: 4,
      },
    );

    redis = (
      app.getHttpAdapter().getInstance() as unknown as { redis: RedisClient }
    ).redis;

    await app.register(
      fastifyCookie as unknown as Parameters<typeof app.register>[0],
      {
        secret: SESSION_SECRET,
        parseOptions: { httpOnly: true, sameSite: 'lax', secure: false },
      },
    );
    await app.register(
      fastifySession as unknown as Parameters<typeof app.register>[0],
      {
        secret: SESSION_SECRET,
        cookieName: COOKIE_NAME,
        saveUninitialized: false,
        rolling: true,
        cookie: {
          httpOnly: true,
          sameSite: 'lax',
          secure: false,
          maxAge: SESSION_TTL * 1000,
        },
        store: new RedisSessionStore(redis, SESSION_TTL),
      },
    );
    await app.register(
      fastifyMultipart as unknown as Parameters<typeof app.register>[0],
      { attachFieldsToBody: 'keyValues' },
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
        sessionSecret: SESSION_SECRET,
        cookieName: COOKIE_NAME,
        redis,
      }),
    );

    await app.listen(0, '127.0.0.1');
    await app.getHttpAdapter().getInstance().ready();

    const address = app.getHttpServer().address() as { port: number };
    baseUrl = `http://127.0.0.1:${address.port}`;

    dataSource = app.get<DataSource>(getDataSourceToken('write'));

    // Seed users
    const userRepo = dataSource.getRepository(UserOrmEntity);
    const supplierRepo = dataSource.getRepository(SupplierOrmEntity);
    const rfqRepo = dataSource.getRepository(RfqOrmEntity);

    const verifiedAt = new Date();

    const insertUser = async (
      label: string,
      role: UserRole,
    ): Promise<SeededUser> => {
      const entity = userRepo.create({
        email: `${runPrefix}-${label}@example.com`,
        name: `${label} ${runPrefix}`,
        role,
        verifiedAt,
        passwordHash: null,
        requiresPasswordSetup: false,
      });
      const saved = await userRepo.save(entity);

      const sessionId = randomUUID();
      const sessionUser: TestSessionUser = {
        id: saved.id,
        _id: saved._id,
        email: saved.email,
        role: saved.role,
        verifiedAt: verifiedAt.toISOString(),
      };
      await seedSession(redis, sessionId, sessionUser, SESSION_TTL);
      const signed = signSessionId(SESSION_SECRET, sessionId);
      return {
        id: saved.id,
        _id: saved._id,
        email: saved.email,
        role: saved.role,
        sessionId,
        cookieHeader: buildCookieHeader(COOKIE_NAME, signed),
      };
    };

    buyer1 = await insertUser('buyer1', UserRole.USER);
    buyer2 = await insertUser('buyer2', UserRole.USER);
    supplierUser1 = await insertUser('supplier1', UserRole.SUPPLIER);
    supplierUser2 = await insertUser('supplier2', UserRole.SUPPLIER);
    outsider = await insertUser('outsider', UserRole.USER);

    const insertSupplier = async (
      ownerUserId: number,
      label: string,
    ): Promise<SeededSupplier> => {
      const entity = supplierRepo.create({
        userId: ownerUserId,
        companyName: `${label} co ${runPrefix}`,
        phoneNumber: `+1555${Math.floor(Math.random() * 1_000_000)
          .toString()
          .padStart(7, '0')}`,
        country: 'US',
        activityType: 'manufacturing',
        businessSize: 'small',
        registrationNumber: `${runPrefix}-${label}-reg`,
        verificationStatus: SupplierVerificationStatus.APPROVED,
        isVerified: true,
      });
      const saved = await supplierRepo.save(entity);
      return { id: saved.id, _id: saved._id, userId: saved.userId };
    };

    supplier1 = await insertSupplier(supplierUser1.id, 's1');
    supplier2 = await insertSupplier(supplierUser2.id, 's2');

    const rfq = await rfqRepo.save(
      rfqRepo.create({
        type: RfqType.PRODUCT_DIRECTED,
        status: RfqStatus.OPEN,
        buyerId: buyer1.id,
        targetSupplierId: supplier1.id,
        productName: `Test product ${runPrefix}`,
        quantity: 10,
        quantityUnit: 'piece',
      }),
    );
    directedRfqId = rfq._id;
    directedRfqInternalId = rfq.id;
  }, 60000);

  afterAll(async () => {
    if (!app) return;
    try {
      // Wipe conversations first (polymorphic, no FK to rfqs); messages +
      // participants cascade from conversations.
      await dataSource
        .getRepository(ConversationOrmEntity)
        .createQueryBuilder()
        .delete()
        .where('subjectId = :sid', { sid: directedRfqId })
        .execute();

      // Users cascade to suppliers + rfqs.
      const ids = [
        buyer1?.id,
        buyer2?.id,
        supplierUser1?.id,
        supplierUser2?.id,
        outsider?.id,
      ].filter((v): v is number => typeof v === 'number');
      if (ids.length > 0) {
        await dataSource.query(`DELETE FROM users WHERE id = ANY($1)`, [ids]);
      }

      // Drop sessions.
      const sessionIds = [
        buyer1?.sessionId,
        buyer2?.sessionId,
        supplierUser1?.sessionId,
        supplierUser2?.sessionId,
        outsider?.sessionId,
      ].filter((v): v is string => typeof v === 'string');
      for (const sid of sessionIds) await destroySession(redis, sid);
    } finally {
      // Nest 11 + @nestjs/typeorm 11 sometimes throws on the global
      // onApplicationShutdown hook when more than one named DataSource is
      // registered. The cleanup itself has already run; swallow the noise so
      // the suite reports green.
      try {
        await app.close();
      } catch {
        /* noop */
      }
    }
  });

  // ---------------------------------------------------------------------------
  // REST
  // ---------------------------------------------------------------------------
  describe('REST', () => {
    let conversationId: string;

    it('buyer opens conversation against directed RFQ → 201', async () => {
      const res = await request(baseUrl)
        .post(`/rfq/${directedRfqId}/suppliers/${supplier1._id}/conversation`)
        .set('Cookie', buyer1.cookieHeader)
        .send();
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      expect((res.body as { conversationId: string }).conversationId).toEqual(
        expect.any(String),
      );
      conversationId = (res.body as { conversationId: string }).conversationId;
    });

    it('second buyer call returns the same conversationId (idempotent)', async () => {
      const res = await request(baseUrl)
        .post(`/rfq/${directedRfqId}/suppliers/${supplier1._id}/conversation`)
        .set('Cookie', buyer1.cookieHeader)
        .send();
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      expect((res.body as { conversationId: string }).conversationId).toBe(
        conversationId,
      );
    });

    it('supplier opens from their side → same conversationId', async () => {
      const res = await request(baseUrl)
        .post(`/rfq/${directedRfqId}/conversation`)
        .set('Cookie', supplierUser1.cookieHeader)
        .send();
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      expect((res.body as { conversationId: string }).conversationId).toBe(
        conversationId,
      );
    });

    it('buyer sends message; supplier sees it via GET', async () => {
      const sendRes = await request(baseUrl)
        .post(`/messaging/conversations/${conversationId}/messages`)
        .set('Cookie', buyer1.cookieHeader)
        .send({ body: 'Hi from buyer' });
      expect(sendRes.status).toBeGreaterThanOrEqual(200);
      expect(sendRes.status).toBeLessThan(300);
      expect(sendRes.body).toEqual(
        expect.objectContaining({
          message: expect.objectContaining({ body: 'Hi from buyer' }),
        }),
      );

      const listRes = await request(baseUrl)
        .get(`/messaging/conversations/${conversationId}/messages`)
        .set('Cookie', supplierUser1.cookieHeader);
      expect(listRes.status).toBe(200);
      const items = (listRes.body as { items: { body: string }[] }).items;
      expect(items.some((m) => m.body === 'Hi from buyer')).toBe(true);
    });

    it('supplier replies and both sides paginate history', async () => {
      const r1 = await request(baseUrl)
        .post(`/messaging/conversations/${conversationId}/messages`)
        .set('Cookie', supplierUser1.cookieHeader)
        .send({ body: 'Hello from supplier' });
      expect(r1.status).toBeLessThan(300);

      const buyerView = await request(baseUrl)
        .get(`/messaging/conversations/${conversationId}/messages?limit=10`)
        .set('Cookie', buyer1.cookieHeader);
      expect(buyerView.status).toBe(200);
      const buyerItems = (buyerView.body as { items: { body: string }[] })
        .items;
      expect(buyerItems.length).toBeGreaterThanOrEqual(2);
      expect(buyerItems.map((m) => m.body)).toEqual(
        expect.arrayContaining(['Hi from buyer', 'Hello from supplier']),
      );
    });

    it('mark-read advances marker; counterpart still has unreadCount > 0', async () => {
      const list = await request(baseUrl)
        .get(`/messaging/conversations/${conversationId}/messages`)
        .set('Cookie', buyer1.cookieHeader);
      const items = (list.body as { items: { _id: string }[] }).items;
      const latest = items[0]; // DESC order

      const mark = await request(baseUrl)
        .post(`/messaging/conversations/${conversationId}/read`)
        .set('Cookie', buyer1.cookieHeader)
        .send({ upToMessageId: latest._id });
      expect(mark.status).toBeLessThan(300);

      const buyerView = await request(baseUrl)
        .get(`/messaging/conversations/${conversationId}`)
        .set('Cookie', buyer1.cookieHeader);
      expect((buyerView.body as { unreadCount: number }).unreadCount).toBe(0);

      const supplierView = await request(baseUrl)
        .get(`/messaging/conversations/${conversationId}`)
        .set('Cookie', supplierUser1.cookieHeader);
      expect(
        (supplierView.body as { unreadCount: number }).unreadCount,
      ).toBeGreaterThan(0);
    });

    it('non-participant gets 403 on POST messages and GET messages', async () => {
      const post = await request(baseUrl)
        .post(`/messaging/conversations/${conversationId}/messages`)
        .set('Cookie', outsider.cookieHeader)
        .send({ body: 'I should not be here' });
      expect(post.status).toBe(403);

      const get = await request(baseUrl)
        .get(`/messaging/conversations/${conversationId}/messages`)
        .set('Cookie', outsider.cookieHeader);
      expect(get.status).toBe(403);
    });

    it('canceled RFQ → POST 409, GET still works', async () => {
      // Flip the RFQ to CANCELLED directly; we already proved the cancel
      // endpoint on its own elsewhere.
      await dataSource
        .getRepository(RfqOrmEntity)
        .update(directedRfqInternalId, { status: RfqStatus.CANCELLED });

      const post = await request(baseUrl)
        .post(`/messaging/conversations/${conversationId}/messages`)
        .set('Cookie', buyer1.cookieHeader)
        .send({ body: 'after cancel' });
      expect(post.status).toBe(409);

      const get = await request(baseUrl)
        .get(`/messaging/conversations/${conversationId}/messages`)
        .set('Cookie', buyer1.cookieHeader);
      expect(get.status).toBe(200);

      // Restore for downstream tests that expect OPEN.
      await dataSource
        .getRepository(RfqOrmEntity)
        .update(directedRfqInternalId, { status: RfqStatus.OPEN });
    });

    it('anonymous request → 401', async () => {
      const res = await request(baseUrl).get(
        `/messaging/conversations/${conversationId}`,
      );
      expect(res.status).toBe(401);
    });

    it('directed-RFQ misroute (wrong supplier) → 403', async () => {
      const res = await request(baseUrl)
        .post(`/rfq/${directedRfqId}/suppliers/${supplier2._id}/conversation`)
        .set('Cookie', buyer1.cookieHeader)
        .send();
      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // WebSocket
  // ---------------------------------------------------------------------------
  describe('WebSocket', () => {
    const sockets: Socket[] = [];
    const NS = '/messaging';

    afterEach(() => {
      while (sockets.length) {
        const s = sockets.pop();
        try {
          s?.disconnect();
        } catch {
          /* noop */
        }
      }
    });

    const connect = (cookieHeader: string | null): Promise<Socket> => {
      const socket = ioClient(`${baseUrl}${NS}`, {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
        extraHeaders: cookieHeader ? { cookie: cookieHeader } : undefined,
      });
      sockets.push(socket);
      return new Promise((resolve, reject) => {
        const onError = (err: Error) => {
          socket.off('connect', onConnect);
          reject(err);
        };
        const onConnect = () => {
          socket.off('connect_error', onError);
          resolve(socket);
        };
        socket.once('connect', onConnect);
        socket.once('connect_error', onError);
      });
    };

    const ensureConversation = async (): Promise<string> => {
      const res = await request(baseUrl)
        .post(`/rfq/${directedRfqId}/suppliers/${supplier1._id}/conversation`)
        .set('Cookie', buyer1.cookieHeader)
        .send();
      return (res.body as { conversationId: string }).conversationId;
    };

    it('rejects connection without cookie', async () => {
      await expect(connect(null)).rejects.toBeDefined();
    });

    it('participant can join, non-participant cannot', async () => {
      const conversationId = await ensureConversation();
      const buyerSock = await connect(buyer1.cookieHeader);
      const join = (await buyerSock.emitWithAck('conversation:join', {
        conversationId,
      })) as { ok: boolean };
      expect(join.ok).toBe(true);

      const outsiderSock = await connect(outsider.cookieHeader);
      const reject = (await outsiderSock.emitWithAck('conversation:join', {
        conversationId,
      })) as { ok: boolean; error?: string };
      expect(reject.ok).toBe(false);
      expect(reject.error).toBe('forbidden');
    });

    it('REST send → buyer socket receives message:new + conversation:updated', async () => {
      const conversationId = await ensureConversation();
      const buyerSock = await connect(buyer1.cookieHeader);
      const join = (await buyerSock.emitWithAck('conversation:join', {
        conversationId,
      })) as { ok: boolean };
      expect(join.ok).toBe(true);

      const messagePromise = new Promise<{
        conversationId: string;
        message: { body: string };
      }>((resolve) =>
        buyerSock.once(
          'message:new',
          (payload: { conversationId: string; message: { body: string } }) =>
            resolve(payload),
        ),
      );
      const updatedPromise = new Promise<{ conversationId: string }>(
        (resolve) =>
          buyerSock.once(
            'conversation:updated',
            (payload: { conversationId: string }) => resolve(payload),
          ),
      );

      const send = await request(baseUrl)
        .post(`/messaging/conversations/${conversationId}/messages`)
        .set('Cookie', supplierUser1.cookieHeader)
        .send({ body: 'WS broadcast test' });
      expect(send.status).toBeLessThan(300);

      const msg = await Promise.race([
        messagePromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('message:new timeout')), 5000),
        ),
      ]);
      expect(msg.conversationId).toBe(conversationId);
      expect(msg.message.body).toBe('WS broadcast test');

      const updated = await Promise.race([
        updatedPromise,
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('conversation:updated timeout')),
            5000,
          ),
        ),
      ]);
      expect(updated.conversationId).toBe(conversationId);
    });

    it('WS-initiated send → counterpart socket receives message:new', async () => {
      const conversationId = await ensureConversation();
      const buyerSock = await connect(buyer1.cookieHeader);
      const supplierSock = await connect(supplierUser1.cookieHeader);
      await buyerSock.emitWithAck('conversation:join', { conversationId });
      await supplierSock.emitWithAck('conversation:join', { conversationId });

      const buyerReceives = new Promise<{ message: { body: string } }>(
        (resolve) =>
          buyerSock.once(
            'message:new',
            (payload: { message: { body: string } }) => resolve(payload),
          ),
      );

      const ack = (await supplierSock.emitWithAck('message:send', {
        conversationId,
        body: 'sent over websocket',
      })) as { ok: boolean };
      expect(ack.ok).toBe(true);

      const got = await Promise.race([
        buyerReceives,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('ws message:new timeout')), 5000),
        ),
      ]);
      expect(got.message.body).toBe('sent over websocket');
    });
  });
});
