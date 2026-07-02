import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifySession from '@fastify/session';
import fastifyCookie from '@fastify/cookie';
import request from 'supertest';
import { App } from 'supertest/types';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthModule } from '../src/contexts/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { UserOrmEntity } from '../src/contexts/auth/infrastructure/persistence/user.orm-entity';
import { OtpCodeOrmEntity } from '../src/contexts/auth/infrastructure/persistence/otp-code.orm-entity';
import { RedisService } from '../src/shared/infrastructure/services/redis.service';
import { EmailService } from '../src/shared/infrastructure/services/email.service';
import { StorageService } from '../src/shared/infrastructure/services/storage.service';
import { PaymentService } from '../src/shared/infrastructure/services/payment.service';
import { ConnectionService } from '../src/shared/infrastructure/persistence/connection.service';
import { UserRepository } from '../src/contexts/auth/infrastructure/persistence/user.repository';
import { OtpCodeRepository } from '../src/contexts/auth/infrastructure/persistence/otp-code.repository';

class StubRedisService {
  private store = new Map<string, string>();
  set(k: string, v: string) {
    this.store.set(k, v);
    return Promise.resolve();
  }
  get(k: string) {
    return Promise.resolve(this.store.get(k) ?? null);
  }
  getdel(k: string) {
    const v = this.store.get(k) ?? null;
    this.store.delete(k);
    return Promise.resolve(v);
  }
  delete(k: string) {
    const had = this.store.has(k);
    this.store.delete(k);
    return Promise.resolve(had ? 1 : 0);
  }
}

class StubEmailService {
  sendOtpEmail() {
    return Promise.resolve();
  }
}

class StubStorageService {
  storeFile() {
    return Promise.resolve('/stub/path');
  }
  storeLocalFile() {
    return Promise.resolve('/stub/path');
  }
  getSignedUrl({ url }: { url: string }) {
    return Promise.resolve(url);
  }
}

class StubPaymentService {}

class StubConnectionService {
  getReadConnection() {
    return null;
  }
  getWriteConnection() {
    return null;
  }
}

class StubUserRepository {
  findById() {
    return Promise.resolve(null);
  }
  findByEmail() {
    return Promise.resolve(null);
  }
  findByEmailIncludingUnverified() {
    return Promise.resolve(null);
  }
  findByPublicId() {
    return Promise.resolve(null);
  }
  save(u: Record<string, unknown>) {
    return Promise.resolve(u);
  }
  updateVerification() {
    return Promise.resolve();
  }
  updatePassword() {
    return Promise.resolve();
  }
  markRequiresPasswordSetup() {
    return Promise.resolve();
  }
}

class StubOtpCodeRepository {
  createRecord() {
    return Promise.resolve({});
  }
  findLatestByEmail() {
    return Promise.resolve(null);
  }
  findLatestByEmailAndPurpose() {
    return Promise.resolve(null);
  }
  invalidateActiveByEmailAndPurpose() {
    return Promise.resolve();
  }
  consumeById() {
    return Promise.resolve(false);
  }
  incrementAttempts() {
    return Promise.resolve();
  }
  markConsumed() {
    return Promise.resolve();
  }
}

describe('Auth password-OTP flow (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        CqrsModule,
        AuthModule,
      ],
    })
      .overrideProvider(RedisService)
      .useClass(StubRedisService)
      .overrideProvider(EmailService)
      .useClass(StubEmailService)
      .overrideProvider(StorageService)
      .useClass(StubStorageService)
      .overrideProvider(PaymentService)
      .useClass(StubPaymentService)
      .overrideProvider(ConnectionService)
      .useClass(StubConnectionService)
      .overrideProvider(getRepositoryToken(UserOrmEntity, 'write'))
      .useValue({})
      .overrideProvider(getRepositoryToken(OtpCodeOrmEntity, 'write'))
      .useValue({})
      .overrideProvider(UserRepository)
      .useClass(StubUserRepository)
      .overrideProvider(OtpCodeRepository)
      .useClass(StubOtpCodeRepository)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await (app as NestFastifyApplication).register(fastifyCookie as never);
    await (app as NestFastifyApplication).register(fastifySession as never, {
      secret: 'test-secret-32-chars-minimum-length',
      cookie: { secure: false },
    });
    await app.init();
    await (app as NestFastifyApplication)
      .getHttpAdapter()
      .getInstance()
      .ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('returns 201 with status=otp_sent for a valid registration', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'Str0ng!Passw0rd123',
          accountType: 'buyer',
        });

      expect(res.status).toBe(201);
      expect((res.body as { status: string }).status).toBe('otp_sent');
    });

    it('returns 400 for a password that fails the policy', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'weak@example.com',
          password: 'weak',
          accountType: 'buyer',
        });

      expect(res.status).toBe(400);
    });

    it('returns 400 for missing email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ password: 'Str0ng!Passw0rd123', accountType: 'buyer' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/verify-otp', () => {
    it('returns 401 when no OTP record exists for the email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          email: 'nobody@example.com',
          code: '123456',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /auth/me', () => {
    it('returns 200 with user=null when no session is present', async () => {
      const res = await request(app.getHttpServer()).get('/auth/me');
      expect(res.status).toBe(200);
      expect((res.body as { user: unknown }).user).toBeNull();
    });
  });
});
